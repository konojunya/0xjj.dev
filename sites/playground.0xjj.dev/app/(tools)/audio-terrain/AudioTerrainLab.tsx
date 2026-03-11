'use client';

import { LoaderCircle, Mic, MicOff, Mountain, Settings2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

// ── Config ──

const DESKTOP_GRID = 128;
const MOBILE_GRID = 64;
const DESKTOP_FFT = 2048;
const MOBILE_FFT = 1024;
const DESKTOP_DPR_CAP = 2.0;
const MOBILE_DPR_CAP = 1.5;
const SMOOTHING = 0.72;
const EMA_WEIGHT = 0.38;
const AUTO_ROTATE_SPEED = 0.06;
const NOISE_GATE = 0.06; // FFT values below this threshold are silenced

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
  varying float vDepth;
  varying vec2 vUv;

  void main() {
    vHeight = position.y;
    vUv = (position.xz + 3.0) / 6.0;
    vec4 viewPos = uView * uModel * vec4(position, 1.0);
    gl_Position = uProjection * viewPos;
    vDepth = -viewPos.z;
  }
`;

const SOLID_FRAG = /* glsl */ `
  precision highp float;
  varying float vHeight;
  varying float vDepth;
  varying vec2 vUv;
  uniform float uEnergy;
  uniform float uBass;
  uniform float uTime;

  vec3 hsl(float h, float s, float l) {
    vec3 k = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return l + s * (k - 0.5) * (1.0 - abs(2.0 * l - 1.0));
  }

  void main() {
    float hn = clamp(vHeight * 2.0, 0.0, 1.0);
    float hue = mod(0.75 - hn * 0.4 + uTime * 0.015 + uBass * 0.2, 1.0);
    float sat = 0.85;
    float lit = 0.06 + hn * 0.5 + pow(hn, 3.0) * 0.4;

    vec3 color = hsl(hue, sat, lit);

    // Hot peaks glow white-ish
    float peak = smoothstep(0.6, 1.0, hn);
    color += peak * vec3(0.8, 0.6, 1.0) * (0.4 + uEnergy * 1.2);

    // Fog
    float fog = smoothstep(3.0, 12.0, vDepth);
    color = mix(color, vec3(0.005, 0.005, 0.02), fog);

    // Vignette from UV
    float vig = 1.0 - smoothstep(0.3, 0.85, length(vUv - 0.5) * 1.4);
    color *= 0.7 + vig * 0.3;

    gl_FragColor = vec4(color, 1.0);
  }
`;

const WIRE_FRAG = /* glsl */ `
  precision highp float;
  varying float vHeight;
  varying float vDepth;
  varying vec2 vUv;
  uniform float uEnergy;
  uniform float uBass;
  uniform float uTime;

  vec3 hsl(float h, float s, float l) {
    vec3 k = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return l + s * (k - 0.5) * (1.0 - abs(2.0 * l - 1.0));
  }

  void main() {
    float hn = clamp(vHeight * 2.0, 0.0, 1.0);

    // Frequency-position hue: left warm -> right cool, shifted by time
    float hue = mod(0.85 - vUv.x * 0.45 + uTime * 0.025 + uBass * 0.25, 1.0);
    float sat = 0.9;
    float lit = 0.12 + hn * 0.55;

    vec3 color = hsl(hue, sat, lit);

    // Neon glow on peaks
    float glow = pow(hn, 2.0) * (1.0 + uEnergy * 2.5);
    color += glow * vec3(0.5, 0.3, 1.0);

    // Fog
    float fog = smoothstep(3.0, 12.0, vDepth);
    color = mix(color, vec3(0.005, 0.005, 0.02), fog);

    gl_FragColor = vec4(color, 1.0);
  }
`;

// Bloom pass: same wireframe but with additive blend, slightly brighter
const BLOOM_FRAG = /* glsl */ `
  precision highp float;
  varying float vHeight;
  varying float vDepth;
  varying vec2 vUv;
  uniform float uEnergy;
  uniform float uBass;
  uniform float uTime;

  vec3 hsl(float h, float s, float l) {
    vec3 k = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return l + s * (k - 0.5) * (1.0 - abs(2.0 * l - 1.0));
  }

  void main() {
    float hn = clamp(vHeight * 2.0, 0.0, 1.0);
    float hue = mod(0.85 - vUv.x * 0.45 + uTime * 0.025 + uBass * 0.25, 1.0);

    // Only peaks contribute to bloom
    float intensity = pow(hn, 3.0) * (0.6 + uEnergy * 1.5);
    vec3 color = hsl(hue, 1.0, 0.6) * intensity;

    float fog = smoothstep(3.0, 10.0, vDepth);
    color *= 1.0 - fog;

    gl_FragColor = vec4(color, intensity * 0.5);
  }
`;

// ── Matrix helpers ──

function mat4Perspective(fov: number, aspect: number, near: number, far: number): Float32Array {
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

function mat4LookAt(eye: number[], target: number[], up: number[]): Float32Array {
  const zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2];
  let len = 1 / Math.sqrt(zx * zx + zy * zy + zz * zz);
  const z0 = zx * len, z1 = zy * len, z2 = zz * len;
  const xx = up[1] * z2 - up[2] * z1, xy = up[2] * z0 - up[0] * z2, xz = up[0] * z1 - up[1] * z0;
  len = 1 / Math.sqrt(xx * xx + xy * xy + xz * xz);
  const x0 = xx * len, x1 = xy * len, x2 = xz * len;
  const y0 = z1 * x2 - z2 * x1, y1 = z2 * x0 - z0 * x2, y2 = z0 * x1 - z1 * x0;
  // prettier-ignore
  return new Float32Array([
    x0, y0, z0, 0,  x1, y1, z1, 0,  x2, y2, z2, 0,
    -(x0*eye[0]+x1*eye[1]+x2*eye[2]),
    -(y0*eye[0]+y1*eye[1]+y2*eye[2]),
    -(z0*eye[0]+z1*eye[1]+z2*eye[2]), 1,
  ]);
}

function mat4Identity(): Float32Array {
  // prettier-ignore
  return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
}

// ── GL helpers ──

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

function buildProgram(gl: WebGLRenderingContext, vert: string, frag: string): WebGLProgram {
  const p = gl.createProgram()!;
  gl.attachShader(p, compileShader(gl, gl.VERTEX_SHADER, vert));
  gl.attachShader(p, compileShader(gl, gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(p);
  return p;
}

// ── Component ──

interface GLState {
  gl: WebGLRenderingContext;
  solidProg: WebGLProgram;
  wireProg: WebGLProgram;
  bloomProg: WebGLProgram;
  posBuf: WebGLBuffer;
  solidIdx: WebGLBuffer;
  wireIdx: WebGLBuffer;
  solidCount: number;
  wireCount: number;
  positions: Float32Array;
  gridW: number;
  gridH: number;
  idxType: number;
}

export function AudioTerrainLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const glRef = useRef<GLState | null>(null);

  const heightmapRef = useRef<Float32Array | null>(null);
  const frontIndexRef = useRef(0);
  const frequencyDataRef = useRef<Uint8Array | null>(null);
  const timeRef = useRef(0);
  const lastFrameRef = useRef(0);
  const mobileRef = useRef(false);

  const smoothEnergyRef = useRef(0);
  const smoothBassRef = useRef(0);

  const orbitRef = useRef({ rotX: -0.48, rotY: 0.3, dragging: false, lastX: 0, lastY: 0, lastDrag: 0 });

  const [isStarting, setIsStarting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(false);

  const scrollSpeedRef = useRef(1.0);
  const heightScaleRef = useRef(2.0);
  const trebleDetailRef = useRef(0.8);
  const wireframeRef = useRef(true);

  const [scrollSpeed, setScrollSpeed] = useState(1.0);
  const [heightScale, setHeightScale] = useState(2.0);
  const [trebleDetail, setTrebleDetail] = useState(0.8);
  const [wireframe, setWireframe] = useState(true);

  // ── Setup ──
  const setupGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const mobile = isMobile();
    mobileRef.current = mobile;
    const dpr = Math.min(window.devicePixelRatio, mobile ? MOBILE_DPR_CAP : DESKTOP_DPR_CAP);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    const gl = canvas.getContext('webgl', {
      alpha: false, antialias: true, depth: true,
      powerPreference: mobile ? 'low-power' : 'default',
    });
    if (!gl) return null;

    const gridSize = mobile ? MOBILE_GRID : DESKTOP_GRID;
    const gridW = gridSize, gridH = gridSize;
    const vertCount = (gridW + 1) * (gridH + 1);

    const positions = new Float32Array(vertCount * 3);
    for (let iz = 0; iz <= gridH; iz++) {
      for (let ix = 0; ix <= gridW; ix++) {
        const i = (iz * (gridW + 1) + ix) * 3;
        positions[i] = (ix / gridW - 0.5) * 6;
        positions[i + 1] = 0;
        positions[i + 2] = (iz / gridH - 0.5) * 6;
      }
    }

    const solidIndices: number[] = [];
    for (let iz = 0; iz < gridH; iz++) {
      for (let ix = 0; ix < gridW; ix++) {
        const a = iz * (gridW + 1) + ix, b = a + 1, c = a + (gridW + 1), d = c + 1;
        solidIndices.push(a, c, b, b, c, d);
      }
    }

    const wireIndices: number[] = [];
    for (let iz = 0; iz < gridH; iz++) {
      for (let ix = 0; ix < gridW; ix++) {
        const a = iz * (gridW + 1) + ix;
        wireIndices.push(a, a + 1, a, a + (gridW + 1));
      }
    }
    for (let iz = 0; iz < gridH; iz++) wireIndices.push(iz * (gridW + 1) + gridW, (iz + 1) * (gridW + 1) + gridW);
    for (let ix = 0; ix < gridW; ix++) wireIndices.push(gridH * (gridW + 1) + ix, gridH * (gridW + 1) + ix + 1);

    if (vertCount > 65535) gl.getExtension('OES_element_index_uint');

    const solidProg = buildProgram(gl, VERT, SOLID_FRAG);
    const wireProg = buildProgram(gl, VERT, WIRE_FRAG);
    const bloomProg = buildProgram(gl, VERT, BLOOM_FRAG);

    const posBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);

    const solidIdx = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, solidIdx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, vertCount > 65535 ? new Uint32Array(solidIndices) : new Uint16Array(solidIndices), gl.STATIC_DRAW);

    const wireIdx = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wireIdx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, vertCount > 65535 ? new Uint32Array(wireIndices) : new Uint16Array(wireIndices), gl.STATIC_DRAW);

    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.005, 0.005, 0.02, 1.0);

    heightmapRef.current = new Float32Array((gridW + 1) * (gridH + 1));
    frontIndexRef.current = 0;

    const state: GLState = {
      gl, solidProg, wireProg, bloomProg, posBuf, solidIdx, wireIdx,
      solidCount: solidIndices.length, wireCount: wireIndices.length,
      positions, gridW, gridH,
      idxType: vertCount > 65535 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
    };
    glRef.current = state;
    return state;
  }, []);

  const startMic = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('このブラウザは getUserMedia に対応していません。');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    streamRef.current = stream;
    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = isMobile() ? MOBILE_FFT : DESKTOP_FFT;
    analyser.smoothingTimeConstant = SMOOTHING;
    analyserRef.current = analyser;
    audioCtx.createMediaStreamSource(stream).connect(analyser);
    frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);
  }, []);

  // ── Draw helper ──
  const draw = useCallback((g: GLState, prog: WebGLProgram, proj: Float32Array, view: Float32Array, model: Float32Array, energy: number, bass: number, t: number, mode: number) => {
    const { gl, posBuf, solidIdx, wireIdx, solidCount, wireCount, idxType } = g;
    gl.useProgram(prog);
    gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'uProjection'), false, proj);
    gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'uView'), false, view);
    gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'uModel'), false, model);
    gl.uniform1f(gl.getUniformLocation(prog, 'uEnergy'), energy);
    gl.uniform1f(gl.getUniformLocation(prog, 'uBass'), bass);
    gl.uniform1f(gl.getUniformLocation(prog, 'uTime'), t);
    const a = gl.getAttribLocation(prog, 'position');
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 3, gl.FLOAT, false, 0, 0);
    if (mode === 0) { gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, solidIdx); gl.drawElements(gl.TRIANGLES, solidCount, idxType, 0); }
    else { gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wireIdx); gl.drawElements(gl.LINES, wireCount, idxType, 0); }
  }, []);

  // ── Render loop ──
  const renderLoop = useCallback((timestamp: number) => {
    if (!isRunningRef.current) return;

    if (mobileRef.current && timestamp - lastFrameRef.current < 33) {
      rafRef.current = requestAnimationFrame(renderLoop);
      return;
    }
    lastFrameRef.current = timestamp;
    if (document.hidden) { rafRef.current = requestAnimationFrame(renderLoop); return; }

    const g = glRef.current;
    const analyser = analyserRef.current;
    const freqData = frequencyDataRef.current;
    const heightmap = heightmapRef.current;
    if (!g || !analyser || !freqData || !heightmap) { rafRef.current = requestAnimationFrame(renderLoop); return; }

    const { gl, solidProg, wireProg, bloomProg, posBuf, positions, gridW, gridH } = g;

    analyser.getByteFrequencyData(freqData);
    const binCount = freqData.length;

    let totalSum = 0;
    const bassEnd = Math.floor(binCount * 0.12);
    let bassSum = 0;
    for (let i = 0; i < binCount; i++) { totalSum += freqData[i]; if (i < bassEnd) bassSum += freqData[i]; }
    const rawEnergy = totalSum / (binCount * 255);
    const rawBass = bassEnd > 0 ? bassSum / (bassEnd * 255) : 0;

    smoothEnergyRef.current += (rawEnergy - smoothEnergyRef.current) * EMA_WEIGHT;
    smoothBassRef.current += (rawBass - smoothBassRef.current) * EMA_WEIGHT;
    const energy = smoothEnergyRef.current;
    const bass = smoothBassRef.current;

    const dt = scrollSpeedRef.current * 0.016;
    timeRef.current += dt;
    const t = timeRef.current;

    const w = gridW + 1;
    const scale = heightScaleRef.current;
    const trebleK = trebleDetailRef.current;

    // New front row: log-scale FFT bin mapping
    const frontRow = frontIndexRef.current;
    const logMax = Math.log(binCount);
    for (let ix = 0; ix <= gridW; ix++) {
      const nx = ix / gridW;
      const binF = Math.exp(nx * logMax);
      const b0 = Math.min(Math.floor(binF), binCount - 1);
      const b1 = Math.min(b0 + 1, binCount - 1);
      const frac = binF - b0;
      const raw = (freqData[b0] * (1 - frac) + freqData[b1] * frac) / 255;
      const val = raw < NOISE_GATE ? 0 : raw;
      const freqFactor = 1.0 - nx * (1.0 - trebleK);
      // Power curve makes peaks more dramatic
      heightmap[frontRow * w + ix] = Math.pow(val, 1.3) * freqFactor * scale;
    }
    frontIndexRef.current = (frontRow + 1) % (gridH + 1);

    for (let iz = 0; iz <= gridH; iz++) {
      const ring = (frontIndexRef.current + iz) % (gridH + 1);
      for (let ix = 0; ix <= gridW; ix++) positions[(iz * w + ix) * 3 + 1] = heightmap[ring * w + ix];
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);

    // Camera: auto-rotate when not dragging
    const orbit = orbitRef.current;
    const idle = Date.now() - orbit.lastDrag > 2000;
    if (idle && !orbit.dragging) orbit.rotY += AUTO_ROTATE_SPEED * dt;

    const bassSway = bass * 0.2;
    const rx = orbit.rotX - bassSway * 0.08;
    const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(orbit.rotY), sy = Math.sin(orbit.rotY);
    const dist = 5.2 - bassSway * 0.3;
    const eye = [dist * sy * cx, dist * -sx + 1.0 + bassSway, dist * cy * cx];
    const canvas = canvasRef.current!;
    const proj = mat4Perspective(Math.PI / 4, canvas.width / canvas.height, 0.1, 50.0);
    const view = mat4LookAt(eye, [0, 0, -0.5], [0, 1, 0]);
    const model = mat4Identity();

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (wireframeRef.current) {
      // Pass 1: wireframe
      gl.disable(gl.BLEND);
      draw(g, wireProg, proj, view, model, energy, bass, t, 1);

      // Pass 2: additive bloom glow on peaks
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.depthMask(false);
      draw(g, bloomProg, proj, view, model, energy, bass, t, 1);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    } else {
      draw(g, solidProg, proj, view, model, energy, bass, t, 0);
    }

    rafRef.current = requestAnimationFrame(renderLoop);
  }, [draw]);

  // ── Orbit ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const down = (e: MouseEvent) => {
      if (isMobile()) return;
      const o = orbitRef.current; o.dragging = true; o.lastX = e.clientX; o.lastY = e.clientY;
    };
    const move = (e: MouseEvent) => {
      const o = orbitRef.current;
      if (!o.dragging) return;
      o.rotY += (e.clientX - o.lastX) * 0.005;
      o.rotX = Math.max(-1.2, Math.min(-0.15, o.rotX - (e.clientY - o.lastY) * 0.005));
      o.lastX = e.clientX; o.lastY = e.clientY; o.lastDrag = Date.now();
    };
    const up = () => { orbitRef.current.dragging = false; };
    canvas.addEventListener('mousedown', down);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { canvas.removeEventListener('mousedown', down); window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, []);

  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close();
      const g = glRef.current;
      if (g) g.gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  const handleStart = async () => {
    if (isStarting || isRunning) return;
    setError(null);
    setIsStarting(true);
    try {
      if (!setupGL()) throw new Error('WebGL の初期化に失敗しました。');
      await startMic();
      isRunningRef.current = true;
      setIsRunning(true);
      timeRef.current = 0;
      smoothEnergyRef.current = 0;
      smoothBassRef.current = 0;
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

  const handleStop = () => {
    isRunningRef.current = false;
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    frequencyDataRef.current = null;
    heightmapRef.current = null;
    frontIndexRef.current = 0;
    setIsRunning(false);
    const g = glRef.current;
    if (g) g.gl.clear(g.gl.COLOR_BUFFER_BIT | g.gl.DEPTH_BUFFER_BIT);
  };

  return (
    <section className="mt-8 space-y-4">
      <div className="overflow-hidden rounded-xl border border-black/10 bg-black dark:border-white/10">
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="aspect-video w-full bg-[#010108] object-cover"
            style={isRunning && !isMobile() ? { cursor: 'grab' } : undefined}
          />

          {/* Start overlay */}
          {!isRunning && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/85 backdrop-blur-sm dark:bg-black/65">
              <div className="max-w-md px-6 text-center">
                <div className="mx-auto inline-flex size-14 items-center justify-center rounded-full border border-black/10 bg-black/[0.03] dark:border-white/14 dark:bg-white/6">
                  {isStarting ? <LoaderCircle className="size-6 animate-spin" /> : <Mountain className="size-6" />}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted">
                  {isStarting
                    ? 'マイクを初期化しています...'
                    : 'マイクのFFTスペクトルを3D地形としてリアルタイム描画します。'}
                </p>
                {!isStarting && (
                  <Button type="button" onClick={handleStart} className="mt-4 font-mono text-xs">
                    <Mic className="size-4" />
                    開始
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Floating settings panel */}
          {isRunning && showControls && (
            <div className="absolute bottom-3 left-3 right-3 rounded-lg border border-white/10 bg-black/60 p-4 backdrop-blur-xl sm:left-auto sm:w-72">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium tracking-wide text-white/50">SPEED</span>
                    <span className="font-mono text-[11px] text-white/40">{scrollSpeed.toFixed(1)}</span>
                  </div>
                  <Slider
                    min={0.1} max={3.0} step={0.1}
                    value={[scrollSpeed]}
                    onValueChange={([v]) => { setScrollSpeed(v); scrollSpeedRef.current = v; }}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium tracking-wide text-white/50">HEIGHT</span>
                    <span className="font-mono text-[11px] text-white/40">{heightScale.toFixed(1)}</span>
                  </div>
                  <Slider
                    min={0.5} max={5.0} step={0.1}
                    value={[heightScale]}
                    onValueChange={([v]) => { setHeightScale(v); heightScaleRef.current = v; }}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium tracking-wide text-white/50">TREBLE</span>
                    <span className="font-mono text-[11px] text-white/40">{trebleDetail.toFixed(1)}</span>
                  </div>
                  <Slider
                    min={0.0} max={2.0} step={0.1}
                    value={[trebleDetail]}
                    onValueChange={([v]) => { setTrebleDetail(v); trebleDetailRef.current = v; }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { setWireframe((p) => { wireframeRef.current = !p; return !p; }); }}
                  className={`w-full rounded-md border px-3 py-1.5 font-mono text-[11px] tracking-wide transition-colors ${
                    wireframe
                      ? 'border-white/20 bg-white/10 text-white/80'
                      : 'border-white/10 bg-transparent text-white/40 hover:text-white/60'
                  }`}
                >
                  {wireframe ? 'WIREFRAME' : 'SOLID'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-black/10 bg-black/[0.02] px-4 py-3 dark:border-white/10 dark:bg-white/[0.02]">
          {isRunning && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowControls((p) => !p)}
              className="font-mono text-xs"
            >
              <Settings2 className="size-4" />
              設定
            </Button>
          )}
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
    </section>
  );
}
