'use client';

import { LoaderCircle, Maximize, Mic, MicOff, Minimize, Settings2, Waves } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

// ── Config ──

const DESKTOP_FFT = 2048;
const MOBILE_FFT = 1024;
const DESKTOP_DPR_CAP = 2.0;
const MOBILE_DPR_CAP = 1.5;
const SMOOTHING = 0.6;
const EMA_WEIGHT = 0.45;
const NOISE_GATE = 0.01;

const BEAT_THRESHOLD = 1.35;
const BEAT_DECAY = 0.92;

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

const VERT = `#version 300 es
precision highp float;

const vec2 POSITIONS[3] = vec2[](
  vec2(-1.0, -1.0),
  vec2(3.0, -1.0),
  vec2(-1.0, 3.0)
);

void main() {
  gl_Position = vec4(POSITIONS[gl_VertexID], 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform float u_treble;
uniform float u_energy;
uniform float u_beat;
uniform float u_speed;
uniform float u_intensity;
uniform float u_complexity;
uniform float u_glow;
uniform float u_maxSteps;

out vec4 outColor;

// ── Hash / noise ──
float hash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}

// ── IQ cosine palette ──
vec3 palette(float t, float shift) {
  vec3 a = vec3(0.5, 0.5, 0.5);
  vec3 b = vec3(0.5, 0.5, 0.5);
  vec3 c = vec3(1.0, 1.0, 1.0);
  vec3 d = vec3(0.263, 0.416, 0.557) + shift;
  return a + b * cos(6.28318 * (c * t + d));
}

// ── SDF primitives ──
float sdSphere(vec3 p, float r) {
  return length(p) - r;
}

float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

float sdOctahedron(vec3 p, float s) {
  p = abs(p);
  return (p.x + p.y + p.z - s) * 0.57735027;
}

// ── Smooth min ──
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// ── Kaleidoscope fold ──
vec3 kaleidoFold(vec3 rd, float folds) {
  float angle = 3.14159 / folds;
  for (int i = 0; i < 10; i++) {
    if (float(i) >= folds) break;
    rd.xy = abs(rd.xy);
    float a = atan(rd.y, rd.x);
    float r = length(rd.xy);
    a = mod(a, 2.0 * angle) - angle;
    rd.xy = vec2(cos(a), sin(a)) * r;
  }
  return rd;
}

// ── Scene SDF ──
// energy controls shape scale: silence → tiny, loud → huge
float scene(vec3 p, float time, float bass, float treble, float mid, float energy) {
  vec3 rp = p;
  rp.z = mod(rp.z + time * 2.0, 8.0) - 4.0;
  rp.x = mod(rp.x + 2.0, 4.0) - 2.0;
  rp.y = mod(rp.y + 2.0, 4.0) - 2.0;

  // Bass dramatically pumps shape size
  float pump = bass * 1.6;
  float scaleE = 0.1 + energy * 1.8; // silence=tiny, loud=big
  float t = time * 0.5;

  float sphere = sdSphere(rp, (0.3 + pump) * scaleE);
  float torus = sdTorus(
    rp - vec3(0, sin(t) * 0.5 * scaleE, 0),
    vec2((0.5 + mid * 0.8) * scaleE, (0.15 + pump * 0.2) * scaleE)
  );
  float octa = sdOctahedron(
    rp + vec3(sin(t * 0.7) * 0.6, 0, cos(t * 0.6) * 0.6) * scaleE,
    (0.4 + pump * 0.5) * scaleE
  );

  float morph = bass * 1.2 + 0.15;
  float d = smin(sphere, torus, 0.5 * morph);
  d = smin(d, octa, 0.6 * morph);

  // Treble → noise displacement (silence = smooth)
  d += noise(p * 3.0 + time) * treble * 0.5;

  return d;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

  float speed = u_speed;
  float intensity = u_intensity;
  float complexity = u_complexity;
  float glowStrength = u_glow;
  int maxSteps = int(u_maxSteps);

  // Energy gates animation speed: silence → near-frozen
  float energyGate = smoothstep(0.0, 0.04, u_energy); // 0→1 ramp (low threshold)
  float timeScale = 0.05 + energyGate * 0.95; // silence=5% speed, full=100%
  float time = u_time * speed * timeScale;

  // Camera: forward motion gated by energy
  float forwardSpeed = (0.1 + u_energy * 3.0 + u_mid * 2.0) * speed;
  vec3 ro = vec3(0.0, 0.0, u_time * forwardSpeed);
  ro.x += sin(time * 0.3) * 1.5 * energyGate;
  ro.y += cos(time * 0.4) * 1.0 * energyGate;

  // FOV: beat makes it zoom in dramatically
  float fov = 1.2 - u_beat * 0.4 - u_energy * 0.2;
  vec3 rd = normalize(vec3(uv, fov));

  // Kaleidoscope fold: all bands contribute — more sound = more fracture
  float folds = complexity + u_bass * 4.0 + u_mid * 3.0 + u_treble * 2.0 + u_energy * 3.0;
  rd = kaleidoFold(rd, folds);

  // Camera rotation speed gated by energy
  float rotSpeed = 0.02 + energyGate * 0.18;
  float ca = cos(time * rotSpeed), sa = sin(time * rotSpeed);
  rd.xz = mat2(ca, -sa, sa, ca) * rd.xz;
  float cb = cos(time * rotSpeed * 0.7 + u_mid), sb = sin(time * rotSpeed * 0.7 + u_mid);
  rd.yz = mat2(cb, -sb, sb, cb) * rd.yz;

  // Raymarching with volumetric glow accumulation
  vec3 color = vec3(0.0);
  float totalDist = 0.0;
  float glowAcc = 0.0;

  // Glow intensity scales with energy: silence → barely visible
  float glowMult = (0.01 + energyGate * 0.07) * intensity;

  for (int i = 0; i < 80; i++) {
    if (i >= maxSteps) break;
    vec3 p = ro + rd * totalDist;
    float d = scene(p, time, u_bass, u_treble, u_mid, u_energy);

    // Volumetric glow accumulation
    float glowContrib = 1.0 / (1.0 + d * d * (8.0 / glowStrength));
    float t = totalDist * 0.03 + time * 0.15 + u_bass * 0.8;
    vec3 glowColor = palette(t, u_bass * 1.0);

    // Saturation scales with energy: silence → grayscale
    float sat = smoothstep(0.0, 0.03, u_energy);
    vec3 gray = vec3(dot(glowColor, vec3(0.299, 0.587, 0.114)));
    glowColor = mix(gray, glowColor, sat);

    color += glowColor * glowContrib * glowMult;
    glowAcc += glowContrib;

    if (d < 0.001) {
      vec3 hitColor = palette(totalDist * 0.05 + time * 0.3, u_bass * 1.5);
      hitColor = mix(vec3(dot(hitColor, vec3(0.299, 0.587, 0.114))), hitColor, sat);
      color += hitColor * intensity * 0.6 * energyGate;
      break;
    }

    if (totalDist > 40.0) break;
    totalDist += d * 0.8;
  }

  // ── Post-processing ──

  // Beat flash: dramatic white + zoom aberration
  if (u_beat > 0.05) {
    color += vec3(u_beat * u_beat * 1.2); // quadratic for punch
    // Strong chromatic aberration
    float aber = u_beat * 0.015;
    vec2 rOff = uv * (1.0 + aber) - uv;
    vec2 bOff = uv * (1.0 - aber) - uv;
    color.r += 0.15 * u_beat * smoothstep(0.3, 0.0, length(uv + rOff));
    color.b += 0.15 * u_beat * smoothstep(0.3, 0.0, length(uv + bOff));
  }

  // Overall brightness: energy cubed for dramatic on/off
  float brightness = u_energy * 3.5 + 0.08;
  color *= brightness;

  // Vignette (stronger when silent)
  float vigStrength = 1.0 + (1.0 - energyGate) * 0.6;
  float vig = 1.0 - smoothstep(0.3, 1.2, length(uv) * vigStrength);
  color *= vig;

  // Reinhard tone mapping
  color = color / (1.0 + color);

  // Gamma
  color = pow(color, vec3(0.9));

  outColor = vec4(color, 1.0);
}
`;

// ── GL helpers ──

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error(info ?? 'Shader compile error');
  }
  return s;
}

function buildProgram(gl: WebGL2RenderingContext, vert: string, frag: string): WebGLProgram {
  const p = gl.createProgram()!;
  gl.attachShader(p, compileShader(gl, gl.VERTEX_SHADER, vert));
  gl.attachShader(p, compileShader(gl, gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(p);
    gl.deleteProgram(p);
    throw new Error(info ?? 'Program link error');
  }
  return p;
}

// ── Component ──

interface GLState {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

export function AudioReactorLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const glRef = useRef<GLState | null>(null);

  const frequencyDataRef = useRef<Uint8Array | null>(null);
  const timeRef = useRef(0);
  const lastFrameRef = useRef(0);
  const mobileRef = useRef(false);

  const smoothBassRef = useRef(0);
  const smoothMidRef = useRef(0);
  const smoothTrebleRef = useRef(0);
  const smoothEnergyRef = useRef(0);
  const beatPulseRef = useRef(0);

  const containerRef = useRef<HTMLDivElement>(null);

  const [isStarting, setIsStarting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(false);

  const speedRef = useRef(1.0);
  const intensityRef = useRef(1.5);
  const complexityRef = useRef(4.0);
  const glowRef = useRef(1.5);

  const [speed, setSpeed] = useState(1.0);
  const [intensity, setIntensity] = useState(1.5);
  const [complexity, setComplexity] = useState(4.0);
  const [glow, setGlow] = useState(1.5);

  // ── Setup GL ──
  const setupGL = useCallback((fullscreen: boolean = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const mobile = isMobile();
    mobileRef.current = mobile;
    const dpr = Math.min(window.devicePixelRatio, mobile ? MOBILE_DPR_CAP : DESKTOP_DPR_CAP);
    if (fullscreen) {
      canvas.width = Math.round(window.screen.width * dpr);
      canvas.height = Math.round(window.screen.height * dpr);
    } else {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    }

    const gl = canvas.getContext('webgl2', {
      alpha: false, antialias: false, depth: false,
      powerPreference: mobile ? 'low-power' : 'high-performance',
    });
    if (!gl) return null;

    const program = buildProgram(gl, VERT, FRAG);
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    gl.useProgram(program);

    const uniformNames = [
      'u_resolution', 'u_time', 'u_bass', 'u_mid', 'u_treble',
      'u_energy', 'u_beat', 'u_speed', 'u_intensity', 'u_complexity',
      'u_glow', 'u_maxSteps',
    ];
    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    for (const name of uniformNames) {
      uniforms[name] = gl.getUniformLocation(program, name);
    }

    const state: GLState = { gl, program, vao, uniforms };
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

  // ── Render loop ──
  const renderLoop = useCallback((timestamp: number) => {
    if (!isRunningRef.current) return;

    // Throttle on mobile to ~30fps
    if (mobileRef.current && timestamp - lastFrameRef.current < 33) {
      rafRef.current = requestAnimationFrame(renderLoop);
      return;
    }
    lastFrameRef.current = timestamp;
    if (document.hidden) { rafRef.current = requestAnimationFrame(renderLoop); return; }

    const g = glRef.current;
    const analyser = analyserRef.current;
    const freqData = frequencyDataRef.current;
    if (!g || !analyser || !freqData) { rafRef.current = requestAnimationFrame(renderLoop); return; }

    const { gl, uniforms } = g;

    // ── Audio analysis ──
    analyser.getByteFrequencyData(freqData);
    const binCount = freqData.length;
    const bassEnd = Math.floor(binCount * 0.12);
    const midEnd = Math.floor(binCount * 0.4);

    let bassSum = 0, midSum = 0, trebleSum = 0, totalSum = 0;
    for (let i = 0; i < binCount; i++) {
      const v = freqData[i] < NOISE_GATE * 255 ? 0 : freqData[i];
      totalSum += v;
      if (i < bassEnd) bassSum += v;
      else if (i < midEnd) midSum += v;
      else trebleSum += v;
    }

    const rawBass = bassEnd > 0 ? bassSum / (bassEnd * 255) : 0;
    const rawMid = (midEnd - bassEnd) > 0 ? midSum / ((midEnd - bassEnd) * 255) : 0;
    const rawTreble = (binCount - midEnd) > 0 ? trebleSum / ((binCount - midEnd) * 255) : 0;
    const rawEnergy = totalSum / (binCount * 255);

    smoothBassRef.current += (rawBass - smoothBassRef.current) * EMA_WEIGHT;
    smoothMidRef.current += (rawMid - smoothMidRef.current) * EMA_WEIGHT;
    smoothTrebleRef.current += (rawTreble - smoothTrebleRef.current) * EMA_WEIGHT;
    smoothEnergyRef.current += (rawEnergy - smoothEnergyRef.current) * EMA_WEIGHT;

    // Beat detection
    if (rawEnergy > smoothEnergyRef.current * BEAT_THRESHOLD) {
      beatPulseRef.current = 1.0;
    }
    beatPulseRef.current *= BEAT_DECAY;

    // Time
    const dt = 0.016;
    timeRef.current += dt;

    // ── Render ──
    const canvas = canvasRef.current!;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(g.program);
    gl.bindVertexArray(g.vao);

    gl.uniform2f(uniforms['u_resolution'], canvas.width, canvas.height);
    gl.uniform1f(uniforms['u_time'], timeRef.current);
    gl.uniform1f(uniforms['u_bass'], smoothBassRef.current);
    gl.uniform1f(uniforms['u_mid'], smoothMidRef.current);
    gl.uniform1f(uniforms['u_treble'], smoothTrebleRef.current);
    gl.uniform1f(uniforms['u_energy'], smoothEnergyRef.current);
    gl.uniform1f(uniforms['u_beat'], beatPulseRef.current);
    gl.uniform1f(uniforms['u_speed'], speedRef.current);
    gl.uniform1f(uniforms['u_intensity'], intensityRef.current);
    gl.uniform1f(uniforms['u_complexity'], complexityRef.current);
    gl.uniform1f(uniforms['u_glow'], glowRef.current);
    gl.uniform1f(uniforms['u_maxSteps'], mobileRef.current ? 40.0 : 80.0);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    rafRef.current = requestAnimationFrame(renderLoop);
  }, []);

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close();
      const g = glRef.current;
      if (g) {
        g.gl.deleteVertexArray(g.vao);
        g.gl.deleteProgram(g.program);
        g.gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    };
  }, []);

  // Rebuild GL when fullscreen changes while running
  const rebuildForMode = useCallback((fullscreen: boolean) => {
    if (!isRunningRef.current) return;
    const oldG = glRef.current;
    if (oldG) {
      oldG.gl.deleteVertexArray(oldG.vao);
      oldG.gl.deleteProgram(oldG.program);
    }
    setupGL(fullscreen);
  }, [setupGL]);

  // Sync fullscreen state & rebuild
  useEffect(() => {
    setCanFullscreen(!!document.fullscreenEnabled);
    const onChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (fs) setShowControls(false);
      rebuildForMode(fs);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [rebuildForMode]);

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
      if (!setupGL()) throw new Error('WebGL2 の初期化に失敗しました。');
      await startMic();
      isRunningRef.current = true;
      setIsRunning(true);
      timeRef.current = 0;
      smoothBassRef.current = 0;
      smoothMidRef.current = 0;
      smoothTrebleRef.current = 0;
      smoothEnergyRef.current = 0;
      beatPulseRef.current = 0;
      rafRef.current = requestAnimationFrame(renderLoop);
    } catch (err) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
      const g = glRef.current;
      if (g) {
        g.gl.deleteVertexArray(g.vao);
        g.gl.deleteProgram(g.program);
        g.gl.getExtension('WEBGL_lose_context')?.loseContext();
        glRef.current = null;
      }
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
    setIsRunning(false);
    const g = glRef.current;
    if (g) {
      g.gl.deleteVertexArray(g.vao);
      g.gl.deleteProgram(g.program);
      g.gl.getExtension('WEBGL_lose_context')?.loseContext();
      glRef.current = null;
    }
  };

  return (
    <section className="mt-8 space-y-4">
      <div ref={containerRef} className="overflow-hidden rounded-xl border border-black/10 bg-black dark:border-white/10">
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="aspect-[16/10] w-full bg-black object-cover"
          />

          {/* Start overlay */}
          {!isRunning && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/85 backdrop-blur-sm dark:bg-black/65">
              <div className="max-w-md px-6 text-center">
                <div className="mx-auto inline-flex size-14 items-center justify-center rounded-full border border-black/10 bg-black/[0.03] dark:border-white/14 dark:bg-white/6">
                  {isStarting ? <LoaderCircle className="size-6 animate-spin" /> : <Waves className="size-6" />}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted">
                  {isStarting
                    ? 'マイクを初期化しています...'
                    : 'マイクの音でレイマーチングされた万華鏡空間が脈動します。音が豊かなほど複雑に割れます。'}
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
                    <span className="font-mono text-[11px] text-white/40">{speed.toFixed(1)}</span>
                  </div>
                  <Slider
                    min={0.1} max={3.0} step={0.1}
                    value={[speed]}
                    onValueChange={([v]) => { setSpeed(v); speedRef.current = v; }}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium tracking-wide text-white/50">INTENSITY</span>
                    <span className="font-mono text-[11px] text-white/40">{intensity.toFixed(1)}</span>
                  </div>
                  <Slider
                    min={0.5} max={3.0} step={0.1}
                    value={[intensity]}
                    onValueChange={([v]) => { setIntensity(v); intensityRef.current = v; }}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium tracking-wide text-white/50">COMPLEXITY</span>
                    <span className="font-mono text-[11px] text-white/40">{complexity.toFixed(0)}</span>
                  </div>
                  <Slider
                    min={2} max={10} step={1}
                    value={[complexity]}
                    onValueChange={([v]) => { setComplexity(v); complexityRef.current = v; }}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium tracking-wide text-white/50">GLOW</span>
                    <span className="font-mono text-[11px] text-white/40">{glow.toFixed(1)}</span>
                  </div>
                  <Slider
                    min={0.5} max={3.0} step={0.1}
                    value={[glow]}
                    onValueChange={([v]) => { setGlow(v); glowRef.current = v; }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-black/10 bg-black/[0.02] px-4 py-3 dark:border-white/10 dark:bg-white/[0.02]">
          {canFullscreen && (
            <Button
              type="button"
              variant="outline"
              onClick={handleFullscreen}
              className="font-mono text-xs"
            >
              {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
              {isFullscreen ? '縮小' : '全画面'}
            </Button>
          )}
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
