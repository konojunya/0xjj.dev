'use client';

import { LoaderCircle, Mic, MicOff, Mountain } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

// ── Config ──

const DESKTOP_GRID = 128;
const MOBILE_GRID = 64;
const DESKTOP_FFT = 2048;
const MOBILE_FFT = 1024;
const DESKTOP_DPR_CAP = 2.0;
const MOBILE_DPR_CAP = 1.5;
const SMOOTHING = 0.8;
const EMA_WEIGHT = 0.3; // raw weight

function isMobile() {
  return typeof window !== 'undefined' && window.innerWidth < 768;
}

function formatError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError')
      return 'マイク権限が拒否されました。ブラウザの設定から microphone を許可してください。';
    if (error.name === 'NotFoundError')
      return 'マイクが見つかりませんでした。';
    if (error.name === 'NotReadableError')
      return '他のアプリがマイクを使用中のため開始できませんでした。';
  }
  if (error instanceof Error) return error.message;
  return 'マイクの起動に失敗しました。';
}

// ── Shaders ──

const VERT = /* glsl */ `
  attribute vec3 position;
  uniform mat4 uProjection;
  uniform mat4 uView;
  uniform mat4 uModel;
  varying float vHeight;
  varying float vFog;

  void main() {
    vHeight = position.y;
    vec4 worldPos = uModel * vec4(position, 1.0);
    vec4 viewPos = uView * worldPos;
    gl_Position = uProjection * viewPos;
    // fog based on distance from camera
    vFog = smoothstep(2.0, 8.0, -viewPos.z);
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  varying float vHeight;
  varying float vFog;

  vec3 terrainColor(float h) {
    // deep blue -> green -> brown -> white snow
    vec3 deepBlue = vec3(0.05, 0.1, 0.3);
    vec3 green    = vec3(0.15, 0.45, 0.15);
    vec3 brown    = vec3(0.45, 0.3, 0.15);
    vec3 snow     = vec3(0.95, 0.97, 1.0);

    float hn = clamp(h * 2.0 + 0.1, 0.0, 1.0);
    if (hn < 0.25) return mix(deepBlue, green, hn / 0.25);
    if (hn < 0.55) return mix(green, brown, (hn - 0.25) / 0.3);
    return mix(brown, snow, (hn - 0.55) / 0.45);
  }

  void main() {
    vec3 color = terrainColor(vHeight);
    vec3 fogColor = vec3(0.02, 0.02, 0.04);
    color = mix(color, fogColor, vFog);
    gl_FragColor = vec4(color, 1.0);
  }
`;

const WIRE_FRAG = /* glsl */ `
  precision mediump float;
  varying float vHeight;
  varying float vFog;

  void main() {
    float brightness = clamp(vHeight * 1.5 + 0.3, 0.15, 1.0);
    vec3 color = vec3(0.3, 0.7, 1.0) * brightness;
    vec3 fogColor = vec3(0.02, 0.02, 0.04);
    color = mix(color, fogColor, vFog);
    gl_FragColor = vec4(color, 1.0);
  }
`;

// ── Matrix helpers (no dependencies) ──

function perspective(fov: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1.0 / Math.tan(fov / 2);
  const nf = 1 / (near - far);
  // prettier-ignore
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ]);
}

function lookAt(eye: number[], target: number[], up: number[]): Float32Array {
  const zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2];
  let len = 1 / Math.sqrt(zx * zx + zy * zy + zz * zz);
  const z0 = zx * len, z1 = zy * len, z2 = zz * len;

  const xx = up[1] * z2 - up[2] * z1, xy = up[2] * z0 - up[0] * z2, xz = up[0] * z1 - up[1] * z0;
  len = 1 / Math.sqrt(xx * xx + xy * xy + xz * xz);
  const x0 = xx * len, x1 = xy * len, x2 = xz * len;

  const y0 = z1 * x2 - z2 * x1, y1 = z2 * x0 - z0 * x2, y2 = z0 * x1 - z1 * x0;

  // prettier-ignore
  return new Float32Array([
    x0, y0, z0, 0,
    x1, y1, z1, 0,
    x2, y2, z2, 0,
    -(x0 * eye[0] + x1 * eye[1] + x2 * eye[2]),
    -(y0 * eye[0] + y1 * eye[1] + y2 * eye[2]),
    -(z0 * eye[0] + z1 * eye[1] + z2 * eye[2]),
    1,
  ]);
}

function identity(): Float32Array {
  // prettier-ignore
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
}

// ── Compile helpers ──

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

function createProgram(gl: WebGLRenderingContext, vert: string, frag: string): WebGLProgram {
  const p = gl.createProgram()!;
  gl.attachShader(p, compileShader(gl, gl.VERTEX_SHADER, vert));
  gl.attachShader(p, compileShader(gl, gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(p);
  return p;
}

// ── High-freq noise ──

function hash(x: number): number {
  const s = Math.sin(x * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function noise1d(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i) * (1 - u) + hash(i + 1) * u;
}

// ── Component ──

interface GLState {
  gl: WebGLRenderingContext;
  solidProgram: WebGLProgram;
  wireProgram: WebGLProgram;
  posBuf: WebGLBuffer;
  solidIdxBuf: WebGLBuffer;
  wireIdxBuf: WebGLBuffer;
  solidIdxCount: number;
  wireIdxCount: number;
  positions: Float32Array;
  gridW: number;
  gridH: number;
}

export function AudioTerrainLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const glStateRef = useRef<GLState | null>(null);

  // Ring buffer
  const heightmapRef = useRef<Float32Array | null>(null);
  const frontIndexRef = useRef(0);
  const frequencyDataRef = useRef<Uint8Array | null>(null);
  const timeRef = useRef(0);
  const lastFrameRef = useRef(0);
  const mobileRef = useRef(false);

  // Smoothed bands
  const smoothBassRef = useRef(0);
  const smoothMidRef = useRef(0);
  const smoothTrebleRef = useRef(0);

  // Orbit (desktop only)
  const orbitRef = useRef({ rotX: -0.85, rotY: 0.4, dragging: false, lastX: 0, lastY: 0 });

  const [isStarting, setIsStarting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Controls
  const scrollSpeedRef = useRef(1.0);
  const bassSensRef = useRef(1.5);
  const trebleDetailRef = useRef(0.8);
  const wireframeRef = useRef(true);

  const [scrollSpeed, setScrollSpeed] = useState(1.0);
  const [bassSens, setBassSens] = useState(1.5);
  const [trebleDetail, setTrebleDetail] = useState(0.8);
  const [wireframe, setWireframe] = useState(true);

  // ── Setup WebGL ──
  const setupGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const mobile = isMobile();
    mobileRef.current = mobile;
    const dprCap = mobile ? MOBILE_DPR_CAP : DESKTOP_DPR_CAP;
    const dpr = Math.min(window.devicePixelRatio, dprCap);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: true,
      depth: true,
      powerPreference: mobile ? 'low-power' : 'default',
    });
    if (!gl) return null;

    const gridSize = mobile ? MOBILE_GRID : DESKTOP_GRID;
    const gridW = gridSize;
    const gridH = gridSize;
    const vertCount = (gridW + 1) * (gridH + 1);

    // Generate plane positions: XZ plane, Y = 0
    const positions = new Float32Array(vertCount * 3);
    for (let iz = 0; iz <= gridH; iz++) {
      for (let ix = 0; ix <= gridW; ix++) {
        const idx = (iz * (gridW + 1) + ix) * 3;
        positions[idx] = (ix / gridW - 0.5) * 6;    // X: -3 to 3
        positions[idx + 1] = 0;                       // Y: height
        positions[idx + 2] = (iz / gridH - 0.5) * 6; // Z: -3 to 3
      }
    }

    // Solid indices (triangles)
    const solidIndices: number[] = [];
    for (let iz = 0; iz < gridH; iz++) {
      for (let ix = 0; ix < gridW; ix++) {
        const a = iz * (gridW + 1) + ix;
        const b = a + 1;
        const c = a + (gridW + 1);
        const d = c + 1;
        solidIndices.push(a, c, b, b, c, d);
      }
    }

    // Wireframe indices (lines)
    const wireIndices: number[] = [];
    for (let iz = 0; iz < gridH; iz++) {
      for (let ix = 0; ix < gridW; ix++) {
        const a = iz * (gridW + 1) + ix;
        const b = a + 1;
        const c = a + (gridW + 1);
        // horizontal + vertical lines
        wireIndices.push(a, b, a, c);
      }
    }
    // right and bottom edges
    for (let iz = 0; iz < gridH; iz++) {
      const a = iz * (gridW + 1) + gridW;
      wireIndices.push(a, a + (gridW + 1));
    }
    for (let ix = 0; ix < gridW; ix++) {
      const a = gridH * (gridW + 1) + ix;
      wireIndices.push(a, a + 1);
    }

    // Programs
    const solidProgram = createProgram(gl, VERT, FRAG);
    const wireProgram = createProgram(gl, VERT, WIRE_FRAG);

    // Buffers
    const posBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);

    const solidIdxBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, solidIdxBuf);
    const solidArr = vertCount > 65535 ? new Uint32Array(solidIndices) : new Uint16Array(solidIndices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, solidArr, gl.STATIC_DRAW);

    const wireIdxBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wireIdxBuf);
    const wireArr = vertCount > 65535 ? new Uint32Array(wireIndices) : new Uint16Array(wireIndices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, wireArr, gl.STATIC_DRAW);

    // Enable OES_element_index_uint for 128x128 grid
    if (vertCount > 65535) {
      gl.getExtension('OES_element_index_uint');
    }

    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.02, 0.02, 0.04, 1.0);

    // Init heightmap ring buffer
    heightmapRef.current = new Float32Array((gridW + 1) * (gridH + 1));
    frontIndexRef.current = 0;

    const state: GLState = {
      gl,
      solidProgram,
      wireProgram,
      posBuf,
      solidIdxBuf,
      wireIdxBuf,
      solidIdxCount: solidIndices.length,
      wireIdxCount: wireIndices.length,
      positions,
      gridW,
      gridH,
    };
    glStateRef.current = state;
    return state;
  }, []);

  // ── Start mic ──
  const startMic = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('このブラウザは getUserMedia に対応していません。');
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    streamRef.current = stream;

    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;

    const mobile = isMobile();
    const fftSize = mobile ? MOBILE_FFT : DESKTOP_FFT;
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = fftSize;
    analyser.smoothingTimeConstant = SMOOTHING;
    analyserRef.current = analyser;

    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);
  }, []);

  // ── Render loop ──
  const renderLoop = useCallback((timestamp: number) => {
    if (!isRunningRef.current) return;

    // Mobile: target 30fps
    if (mobileRef.current && timestamp - lastFrameRef.current < 33) {
      rafRef.current = requestAnimationFrame(renderLoop);
      return;
    }
    lastFrameRef.current = timestamp;

    // Pause when hidden
    if (document.hidden) {
      rafRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    const s = glStateRef.current;
    const analyser = analyserRef.current;
    const freqData = frequencyDataRef.current;
    const heightmap = heightmapRef.current;

    if (!s || !analyser || !freqData || !heightmap) {
      rafRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    const { gl, solidProgram, wireProgram, posBuf, solidIdxBuf, wireIdxBuf, solidIdxCount, wireIdxCount, positions, gridW, gridH } = s;

    // Get frequency data
    analyser.getByteFrequencyData(freqData);
    const binCount = freqData.length;

    // Band decomposition
    const bassEnd = Math.floor(binCount * 0.1);
    const midEnd = Math.floor(binCount * 0.4);

    let bassSum = 0;
    for (let i = 0; i < bassEnd; i++) bassSum += freqData[i];
    let midSum = 0;
    for (let i = bassEnd; i < midEnd; i++) midSum += freqData[i];
    let trebleSum = 0;
    for (let i = midEnd; i < binCount; i++) trebleSum += freqData[i];

    const rawBass = bassEnd > 0 ? bassSum / (bassEnd * 255) : 0;
    const rawMid = (midEnd - bassEnd) > 0 ? midSum / ((midEnd - bassEnd) * 255) : 0;
    const rawTreble = (binCount - midEnd) > 0 ? trebleSum / ((binCount - midEnd) * 255) : 0;

    // EMA smoothing
    smoothBassRef.current = smoothBassRef.current * (1 - EMA_WEIGHT) + rawBass * EMA_WEIGHT;
    smoothMidRef.current = smoothMidRef.current * (1 - EMA_WEIGHT) + rawMid * EMA_WEIGHT;
    smoothTrebleRef.current = smoothTrebleRef.current * (1 - EMA_WEIGHT) + rawTreble * EMA_WEIGHT;

    const bass = smoothBassRef.current;
    const mid = smoothMidRef.current;
    const treble = smoothTrebleRef.current;

    const dt = scrollSpeedRef.current * 0.016;
    timeRef.current += dt;
    const t = timeRef.current;

    const w = gridW + 1;

    // Ring buffer scroll: compute new front row
    const frontRow = frontIndexRef.current;
    for (let ix = 0; ix <= gridW; ix++) {
      const nx = ix / gridW;
      const bassH = bass * Math.sin(nx * Math.PI * 1.5) * bassSensRef.current;
      const midH = mid * Math.sin(nx * Math.PI * 4 + t) * 1.0;
      const trebleH = treble * noise1d(nx * 20 + t * 3) * trebleDetailRef.current;
      heightmap[frontRow * w + ix] = bassH + midH + trebleH;
    }
    frontIndexRef.current = (frontRow + 1) % (gridH + 1);

    // Write heightmap into position Y, mapping ring buffer rows to Z order
    for (let iz = 0; iz <= gridH; iz++) {
      const ringRow = (frontIndexRef.current + iz) % (gridH + 1);
      for (let ix = 0; ix <= gridW; ix++) {
        const posIdx = (iz * w + ix) * 3;
        positions[posIdx + 1] = heightmap[ringRow * w + ix];
      }
    }

    // Upload positions
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);

    // Camera
    const canvas = canvasRef.current!;
    const aspect = canvas.width / canvas.height;
    const proj = perspective(Math.PI / 4, aspect, 0.1, 50.0);

    // Orbit or fixed camera
    const orbit = orbitRef.current;
    const cosX = Math.cos(orbit.rotX), sinX = Math.sin(orbit.rotX);
    const cosY = Math.cos(orbit.rotY), sinY = Math.sin(orbit.rotY);
    const dist = 6.0;
    const eyeX = dist * sinY * cosX;
    const eyeY = dist * -sinX + 0.5;
    const eyeZ = dist * cosY * cosX;
    const view = lookAt([eyeX, eyeY, eyeZ], [0, 0, 0], [0, 1, 0]);
    const model = identity();

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const useWire = wireframeRef.current;
    const program = useWire ? wireProgram : solidProgram;

    gl.useProgram(program);

    // Uniforms
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uProjection'), false, proj);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uView'), false, view);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uModel'), false, model);

    // Position attribute
    const aPos = gl.getAttribLocation(program, 'position');
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

    const vertCount = (gridW + 1) * (gridH + 1);
    const idxType = vertCount > 65535 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;

    if (useWire) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wireIdxBuf);
      gl.drawElements(gl.LINES, wireIdxCount, idxType, 0);
    } else {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, solidIdxBuf);
      gl.drawElements(gl.TRIANGLES, solidIdxCount, idxType, 0);
    }

    rafRef.current = requestAnimationFrame(renderLoop);
  }, []);

  // ── Orbit controls (desktop) ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMouseDown = (e: MouseEvent) => {
      if (isMobile()) return;
      orbitRef.current.dragging = true;
      orbitRef.current.lastX = e.clientX;
      orbitRef.current.lastY = e.clientY;
    };
    const onMouseMove = (e: MouseEvent) => {
      const o = orbitRef.current;
      if (!o.dragging) return;
      const dx = e.clientX - o.lastX;
      const dy = e.clientY - o.lastY;
      o.rotY += dx * 0.005;
      o.rotX = Math.max(-1.2, Math.min(-0.1, o.rotX - dy * 0.005));
      o.lastX = e.clientX;
      o.lastY = e.clientY;
    };
    const onMouseUp = () => { orbitRef.current.dragging = false; };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close();
      const s = glStateRef.current;
      if (s) {
        s.gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    };
  }, []);

  // ── Start ──
  const handleStart = async () => {
    if (isStarting || isRunning) return;
    setError(null);
    setIsStarting(true);

    try {
      const glState = setupGL();
      if (!glState) throw new Error('WebGL の初期化に失敗しました。');

      await startMic();

      isRunningRef.current = true;
      setIsRunning(true);
      timeRef.current = 0;
      lastFrameRef.current = 0;
      smoothBassRef.current = 0;
      smoothMidRef.current = 0;
      smoothTrebleRef.current = 0;
      rafRef.current = requestAnimationFrame(renderLoop);
    } catch (err) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
      setError(formatError(err));
    } finally {
      setIsStarting(false);
    }
  };

  // ── Stop ──
  const handleStop = () => {
    isRunningRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    frequencyDataRef.current = null;
    heightmapRef.current = null;
    frontIndexRef.current = 0;
    setIsRunning(false);

    const s = glStateRef.current;
    if (s) {
      s.gl.clear(s.gl.COLOR_BUFFER_BIT | s.gl.DEPTH_BUFFER_BIT);
    }
  };

  return (
    <section className="mt-8 space-y-4">
      <div className="overflow-hidden rounded-xl border border-black/10 bg-black dark:border-white/10">
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="aspect-video w-full bg-[#050510] object-cover"
            style={isRunning && !isMobile() ? { cursor: 'grab' } : undefined}
          />
          {!isRunning && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/85 backdrop-blur-sm dark:bg-black/65">
              <div className="max-w-md px-6 text-center">
                <div className="mx-auto inline-flex size-14 items-center justify-center rounded-full border border-black/10 bg-black/[0.03] dark:border-white/14 dark:bg-white/6">
                  {isStarting ? <LoaderCircle className="size-6 animate-spin" /> : <Mountain className="size-6" />}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted">
                  {isStarting
                    ? 'マイクを初期化しています...'
                    : 'マイク権限を要求し、FFTスペクトルから3D地形を生成します。'}
                </p>
                {!isStarting && (
                  <Button
                    type="button"
                    onClick={handleStart}
                    className="mt-4 font-mono text-xs"
                  >
                    <Mic className="size-4" />
                    開始
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-black/10 bg-black/[0.02] px-4 py-3 dark:border-white/10 dark:bg-white/[0.02]">
          <Button
            type="button"
            onClick={handleStart}
            disabled={isStarting || isRunning}
            className="font-mono text-xs"
          >
            {isStarting ? <LoaderCircle className="size-4 animate-spin" /> : <Mic className="size-4" />}
            開始
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleStop}
            disabled={!isRunning && !isStarting}
            className="font-mono text-xs"
          >
            <MicOff className="size-4" />
            停止
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted">Scroll Speed: {scrollSpeed.toFixed(1)}</span>
          <input
            type="range"
            min="0.1"
            max="3.0"
            step="0.1"
            value={scrollSpeed}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setScrollSpeed(v);
              scrollSpeedRef.current = v;
            }}
            className="w-full accent-accent"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted">Bass Sensitivity: {bassSens.toFixed(1)}</span>
          <input
            type="range"
            min="0.0"
            max="3.0"
            step="0.1"
            value={bassSens}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setBassSens(v);
              bassSensRef.current = v;
            }}
            className="w-full accent-accent"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted">Treble Detail: {trebleDetail.toFixed(1)}</span>
          <input
            type="range"
            min="0.0"
            max="2.0"
            step="0.1"
            value={trebleDetail}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setTrebleDetail(v);
              trebleDetailRef.current = v;
            }}
            className="w-full accent-accent"
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={wireframe}
            onChange={(e) => {
              setWireframe(e.target.checked);
              wireframeRef.current = e.target.checked;
            }}
            className="accent-accent"
          />
          <span className="text-xs font-medium text-muted">Wireframe</span>
        </label>
      </div>
    </section>
  );
}
