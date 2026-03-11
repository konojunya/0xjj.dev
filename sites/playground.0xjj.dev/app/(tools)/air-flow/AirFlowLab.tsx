'use client';

import { Camera, LoaderCircle, Maximize, Minimize, VideoOff, Wind } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

const OPENCV_WORKER_PATH = '/opencv/opticalflow.worker.js';
const OPENCV_LOAD_TIMEOUT_MS = 30_000;

// Flow / particle config
const FLOW_STRENGTH = 0.0008;
const DAMPING = 0.96;
const AMBIENT_DRIFT = 0.0002;
const EMA_ALPHA = 0.3; // raw weight in exponential moving average
const DESKTOP_PARTICLES = 12_000;
const MOBILE_PARTICLES = 5_000;

// Capture resolution
const DESKTOP_CAP_W = 160;
const DESKTOP_CAP_H = 120;
const MOBILE_CAP_W = 120;
const MOBILE_CAP_H = 90;

// Frame skip (send every N frames)
const DESKTOP_FRAME_SKIP = 3;
const MOBILE_FRAME_SKIP = 4;

function isMobile() {
  return typeof window !== 'undefined' && window.innerWidth < 768;
}

function formatError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError')
      return 'カメラ権限が拒否されました。ブラウザの設定から camera を許可してください。';
    if (error.name === 'NotFoundError')
      return '利用可能なカメラが見つかりませんでした。';
    if (error.name === 'NotReadableError')
      return '他のアプリがカメラを使用中のため開始できませんでした。';
  }
  if (error instanceof Error) return error.message;
  return 'カメラの起動に失敗しました。';
}

// Bilinear interpolation of flow field
function sampleFlow(
  field: Float32Array,
  gridW: number,
  gridH: number,
  nx: number,
  ny: number,
): number {
  const gx = nx * (gridW - 1);
  const gy = ny * (gridH - 1);
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const x1 = Math.min(x0 + 1, gridW - 1);
  const y1 = Math.min(y0 + 1, gridH - 1);
  const fx = gx - x0;
  const fy = gy - y0;
  const v00 = field[y0 * gridW + x0];
  const v10 = field[y0 * gridW + x1];
  const v01 = field[y1 * gridW + x0];
  const v11 = field[y1 * gridW + x1];
  return (v00 * (1 - fx) * (1 - fy)) + (v10 * fx * (1 - fy)) + (v01 * (1 - fx) * fy) + (v11 * fx * fy);
}

interface FlowData {
  flowX: Float32Array;
  flowY: Float32Array;
  gridW: number;
  gridH: number;
}

export function AirFlowLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const workerReadyRef = useRef(false);
  const processingRef = useRef(false);
  const isRunningRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const frameCountRef = useRef(0);
  const captureCanvasRef = useRef<OffscreenCanvas | null>(null);

  // Flow field (EMA-smoothed)
  const flowFieldRef = useRef<FlowData | null>(null);
  // Raw latest flow for EMA blending
  const rawFlowRef = useRef<FlowData | null>(null);

  // Particle data (CPU)
  const particleCountRef = useRef(0);
  const posRef = useRef<Float32Array | null>(null);
  const velRef = useRef<Float32Array | null>(null);
  const lifeRef = useRef<Float32Array | null>(null);
  const maxLifeRef = useRef<Float32Array | null>(null);

  // OGL-like refs (raw WebGL)
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const posBufferRef = useRef<WebGLBuffer | null>(null);
  const opacityBufferRef = useRef<WebGLBuffer | null>(null);
  const uResolutionLocRef = useRef<WebGLUniformLocation | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const [isStarting, setIsStarting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize particles
  const initParticles = useCallback((count: number) => {
    particleCountRef.current = count;
    const pos = new Float32Array(count * 2);
    const vel = new Float32Array(count * 2);
    const life = new Float32Array(count);
    const maxLife = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      pos[i * 2] = Math.random();
      pos[i * 2 + 1] = Math.random();
      vel[i * 2] = 0;
      vel[i * 2 + 1] = 0;
      life[i] = Math.random() * 300 + 100;
      maxLife[i] = life[i];
    }

    posRef.current = pos;
    velRef.current = vel;
    lifeRef.current = life;
    maxLifeRef.current = maxLife;
  }, []);

  // Setup WebGL
  const setupGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    const mobile = isMobile();
    canvas.width = mobile ? 480 : 960;
    canvas.height = mobile ? 360 : 720;

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      powerPreference: mobile ? 'low-power' : 'default',
    });
    if (!gl) return false;

    glRef.current = gl;

    // Shaders
    const vsSource = `
      attribute vec2 a_position;
      attribute float a_opacity;
      uniform vec2 u_resolution;
      varying float v_opacity;
      void main() {
        // Mirror X for selfie view, map [0,1] to clip space
        vec2 pos = vec2(1.0 - a_position.x, 1.0 - a_position.y);
        vec2 clip = pos * 2.0 - 1.0;
        gl_Position = vec4(clip, 0.0, 1.0);
        gl_PointSize = 1.5 + a_opacity * 1.5;
        v_opacity = a_opacity;
      }
    `;
    const fsSource = `
      precision mediump float;
      varying float v_opacity;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = dot(c, c);
        if (d > 0.25) discard;
        float alpha = smoothstep(0.25, 0.05, d) * v_opacity;
        vec3 color = vec3(0.85, 0.9, 1.0);
        gl_FragColor = vec4(color * alpha, alpha);
      }
    `;

    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);
    programRef.current = program;

    // Buffers
    posBufferRef.current = gl.createBuffer();
    opacityBufferRef.current = gl.createBuffer();

    // Uniforms
    uResolutionLocRef.current = gl.getUniformLocation(program, 'u_resolution');
    gl.uniform2f(uResolutionLocRef.current, canvas.width, canvas.height);

    // Blend: additive
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    gl.clearColor(0.02, 0.02, 0.04, 1.0);

    return true;
  }, []);

  // Load OpenCV worker
  const loadWorker = useCallback((): Promise<Worker> => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(OPENCV_WORKER_PATH);
      workerRef.current = worker;

      const timeout = window.setTimeout(() => {
        worker.terminate();
        reject(new Error(`OpenCV の読み込みが ${OPENCV_LOAD_TIMEOUT_MS / 1000} 秒でタイムアウトしました。`));
      }, OPENCV_LOAD_TIMEOUT_MS);

      worker.onmessage = (e: MessageEvent) => {
        const msg = e.data;
        if (msg.type === 'ready') {
          window.clearTimeout(timeout);
          workerReadyRef.current = true;

          worker.onmessage = (ev: MessageEvent) => {
            if (ev.data.type === 'flow') {
              rawFlowRef.current = {
                flowX: ev.data.flowX,
                flowY: ev.data.flowY,
                gridW: ev.data.gridW,
                gridH: ev.data.gridH,
              };
              processingRef.current = false;
            }
          };

          resolve(worker);
        } else if (msg.type === 'error') {
          window.clearTimeout(timeout);
          reject(new Error(msg.error));
        }
      };

      worker.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error('OpenCV Worker の起動に失敗しました。'));
      };
    });
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('このブラウザは getUserMedia に対応していません。');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });

    const video = videoRef.current;
    if (!video) {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error('ビデオ要素の初期化に失敗しました。');
    }

    streamRef.current = stream;
    video.srcObject = stream;

    await new Promise<void>((resolve) => {
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) { resolve(); return; }
      video.addEventListener('loadedmetadata', () => resolve(), { once: true });
    });

    await video.play();

    const mobile = isMobile();
    const capW = mobile ? MOBILE_CAP_W : DESKTOP_CAP_W;
    const capH = mobile ? MOBILE_CAP_H : DESKTOP_CAP_H;
    captureCanvasRef.current = new OffscreenCanvas(capW, capH);
  }, []);

  // Main animation loop
  const renderLoop = useCallback(() => {
    if (!isRunningRef.current) return;

    const gl = glRef.current;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const pos = posRef.current;
    const vel = velRef.current;
    const life = lifeRef.current;
    const maxLifeArr = maxLifeRef.current;
    const count = particleCountRef.current;

    if (!gl || !canvas || !pos || !vel || !life || !maxLifeArr) {
      rafRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    // Send frame to worker
    const mobile = isMobile();
    const frameSkip = mobile ? MOBILE_FRAME_SKIP : DESKTOP_FRAME_SKIP;
    frameCountRef.current++;

    if (
      video &&
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      workerReadyRef.current &&
      !processingRef.current &&
      frameCountRef.current % frameSkip === 0
    ) {
      const capCanvas = captureCanvasRef.current;
      if (capCanvas) {
        const ctx = capCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, capCanvas.width, capCanvas.height);
          const imageData = ctx.getImageData(0, 0, capCanvas.width, capCanvas.height);
          processingRef.current = true;
          workerRef.current?.postMessage(
            { type: 'frame', buffer: imageData.data.buffer, width: capCanvas.width, height: capCanvas.height },
            [imageData.data.buffer],
          );
        }
      }
    }

    // Blend raw flow into smoothed field (EMA)
    const raw = rawFlowRef.current;
    if (raw) {
      const field = flowFieldRef.current;
      if (!field || field.gridW !== raw.gridW || field.gridH !== raw.gridH) {
        // First flow or grid changed — use raw directly
        flowFieldRef.current = {
          flowX: new Float32Array(raw.flowX),
          flowY: new Float32Array(raw.flowY),
          gridW: raw.gridW,
          gridH: raw.gridH,
        };
      } else {
        const len = field.flowX.length;
        for (let i = 0; i < len; i++) {
          field.flowX[i] = field.flowX[i] * (1 - EMA_ALPHA) + raw.flowX[i] * EMA_ALPHA;
          field.flowY[i] = field.flowY[i] * (1 - EMA_ALPHA) + raw.flowY[i] * EMA_ALPHA;
        }
      }
      rawFlowRef.current = null;
    }

    // Update particles
    const field = flowFieldRef.current;
    const opacities = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const ix = i * 2;
      const iy = ix + 1;

      let fx = 0;
      let fy = 0;
      if (field) {
        // Mirror X for selfie flow alignment
        const mx = 1.0 - pos[ix];
        fx = sampleFlow(field.flowX, field.gridW, field.gridH, mx, pos[iy]) * FLOW_STRENGTH;
        fy = sampleFlow(field.flowY, field.gridW, field.gridH, mx, pos[iy]) * FLOW_STRENGTH;
      }

      vel[ix] = vel[ix] * DAMPING + fx;
      vel[iy] = vel[iy] * DAMPING + fy - AMBIENT_DRIFT;

      pos[ix] += vel[ix];
      pos[iy] += vel[iy];

      life[i] -= 1;

      // Life fade
      const lifeRatio = Math.max(0, life[i] / maxLifeArr[i]);
      const lifeFade = lifeRatio < 0.2 ? lifeRatio / 0.2 : lifeRatio > 0.8 ? (1 - lifeRatio) / 0.2 : 1;

      // Speed boost
      const speed = Math.sqrt(vel[ix] * vel[ix] + vel[iy] * vel[iy]);
      const speedBoost = Math.min(1, speed * 200);
      opacities[i] = lifeFade * (0.15 + 0.85 * speedBoost);

      // Respawn if out of bounds or dead
      if (life[i] <= 0 || pos[ix] < 0 || pos[ix] > 1 || pos[iy] < 0 || pos[iy] > 1) {
        pos[ix] = Math.random();
        pos[iy] = Math.random();
        vel[ix] = 0;
        vel[iy] = 0;
        life[i] = Math.random() * 300 + 100;
        maxLifeArr[i] = life[i];
        opacities[i] = 0;
      }
    }

    // Render
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const program = programRef.current!;

    // Position attribute
    const aPos = gl.getAttribLocation(program, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, posBufferRef.current);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Opacity attribute
    const aOpacity = gl.getAttribLocation(program, 'a_opacity');
    gl.bindBuffer(gl.ARRAY_BUFFER, opacityBufferRef.current);
    gl.bufferData(gl.ARRAY_BUFFER, opacities, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aOpacity);
    gl.vertexAttribPointer(aOpacity, 1, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.POINTS, 0, count);

    rafRef.current = requestAnimationFrame(renderLoop);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      workerRef.current?.terminate();
      const gl = glRef.current;
      if (gl) {
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    };
  }, []);

  // Sync fullscreen state
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const handleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  };

  const handleStart = async () => {
    if (isStarting || isRunning) return;

    setError(null);
    setIsStarting(true);

    try {
      const mobile = isMobile();
      const particleCount = mobile ? MOBILE_PARTICLES : DESKTOP_PARTICLES;
      initParticles(particleCount);

      if (!setupGL()) {
        throw new Error('WebGL の初期化に失敗しました。');
      }

      await Promise.all([startCamera(), loadWorker()]);

      isRunningRef.current = true;
      setIsRunning(true);
      frameCountRef.current = 0;
      rafRef.current = requestAnimationFrame(renderLoop);
    } catch (err) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      workerRef.current?.terminate();
      workerRef.current = null;
      workerReadyRef.current = false;
      setError(formatError(err));
      if (videoRef.current) videoRef.current.srcObject = null;
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = () => {
    isRunningRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    workerRef.current?.terminate();
    workerRef.current = null;
    workerReadyRef.current = false;
    processingRef.current = false;
    flowFieldRef.current = null;
    rawFlowRef.current = null;
    captureCanvasRef.current = null;
    setIsRunning(false);

    const gl = glRef.current;
    if (gl) {
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  return (
    <section className="mt-8 space-y-4">
      <div ref={containerRef} className="overflow-hidden rounded-xl border border-black/10 bg-black dark:border-white/10">
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="aspect-video w-full bg-[#050510] object-cover"
          />
          {!isRunning && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/85 backdrop-blur-sm dark:bg-black/65">
              <div className="max-w-md px-6 text-center">
                <div className="mx-auto inline-flex size-14 items-center justify-center rounded-full border border-black/10 bg-black/[0.03] dark:border-white/14 dark:bg-white/6">
                  {isStarting ? <LoaderCircle className="size-6 animate-spin" /> : <Wind className="size-6" />}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted">
                  {isStarting
                    ? 'カメラと OpenCV を読み込んでいます...'
                    : '開始を押すと、カメラ権限を要求しパーティクルの可視化を開始します。'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-black/10 bg-black/[0.02] px-4 py-3 dark:border-white/10 dark:bg-white/[0.02]">
          <Button
            type="button"
            variant="outline"
            onClick={handleFullscreen}
            className="font-mono text-xs"
          >
            {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
            {isFullscreen ? '縮小' : '全画面'}
          </Button>
          <Button
            type="button"
            onClick={handleStart}
            disabled={isStarting || isRunning}
            className="font-mono text-xs"
          >
            {isStarting ? <LoaderCircle className="size-4 animate-spin" /> : <Camera className="size-4" />}
            開始
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleStop}
            disabled={!isRunning && !isStarting}
            className="font-mono text-xs"
          >
            <VideoOff className="size-4" />
            停止
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <video ref={videoRef} className="hidden" playsInline muted />
    </section>
  );
}
