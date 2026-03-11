'use client';

import { useEffect, useRef, useState } from 'react';
import type { FragmentShaderDefinition, ShaderControlValues } from './types';

const VERTEX_SHADER_SOURCE = `#version 300 es
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

type Capability = 'ready' | 'unsupported' | 'error';

interface ShaderCanvasProps {
  definition: FragmentShaderDefinition;
  values: ShaderControlValues;
  isRunning: boolean;
}

interface BuiltinUniforms {
  resolution: WebGLUniformLocation | null;
  time: WebGLUniformLocation | null;
  pointer: WebGLUniformLocation | null;
  frame: WebGLUniformLocation | null;
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('Failed to create shader.');
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) ?? 'Unknown shader compile error.';
    gl.deleteShader(shader);
    throw new Error(info);
  }

  return shader;
}

function createProgram(gl: WebGL2RenderingContext, fragmentShaderSource: string): WebGLProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = gl.createProgram();

  if (!program) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    throw new Error('Failed to create program.');
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) ?? 'Unknown program link error.';
    gl.deleteProgram(program);
    throw new Error(info);
  }

  return program;
}

function buildDefaultPointer(): { x: number; y: number } {
  return { x: 0.5, y: 0.5 };
}

export function ShaderCanvas({ definition, values, isRunning }: ShaderCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const valuesRef = useRef(values);
  const runningRef = useRef(isRunning);
  const pointerRef = useRef(buildDefaultPointer());
  const [capability, setCapability] = useState<Capability>('ready');
  const [message, setMessage] = useState<string>('');
  const [fps, setFps] = useState<number>(0);

  valuesRef.current = values;
  runningRef.current = isRunning;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let animationFrame = 0;
    let frame = 0;
    let frameBatch = 0;
    let lastFpsTime = performance.now();
    const startedAt = performance.now();
    let resizeObserver: ResizeObserver | null = null;
    let program: WebGLProgram | null = null;
    let vao: WebGLVertexArrayObject | null = null;
    let visible = true;

    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    const TARGET_FPS = isMobile ? 30 : 60;
    const FRAME_INTERVAL = 1000 / TARGET_FPS;
    let lastRenderTime = 0;

    try {
      const gl = canvas.getContext('webgl2', {
        alpha: false,
        antialias: false,
        depth: false,
        powerPreference: isMobile ? 'low-power' : 'high-performance',
        preserveDrawingBuffer: false,
        stencil: false,
      });

      if (!gl) {
        throw new Error('WebGL2 is not available in this browser.');
      }

      program = createProgram(gl, definition.fragmentShader);
      const activeProgram = program;
      vao = gl.createVertexArray();

      if (!vao) {
        throw new Error('Failed to create vertex array.');
      }

      gl.bindVertexArray(vao);
      gl.useProgram(activeProgram);

      const builtinUniforms: BuiltinUniforms = {
        resolution: gl.getUniformLocation(activeProgram, 'u_resolution'),
        time: gl.getUniformLocation(activeProgram, 'u_time'),
        pointer: gl.getUniformLocation(activeProgram, 'u_pointer'),
        frame: gl.getUniformLocation(activeProgram, 'u_frame'),
      };

      const controlUniforms = new Map(
        definition.controls.map((control) => [
          control.key,
          gl.getUniformLocation(activeProgram, `u_${control.key}`),
        ]),
      );

      const resize = () => {
        const rect = canvas.getBoundingClientRect();
        const maxDpr = isMobile ? 1.5 : 2;
        const dpr = Math.max(
          0.5,
          Math.min(window.devicePixelRatio || 1, maxDpr) * (definition.renderScale ?? 1),
        );
        const width = Math.max(1, Math.round(rect.width * dpr));
        const height = Math.max(1, Math.round(rect.height * dpr));

        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
          gl.viewport(0, 0, width, height);
        }
      };

      resize();

      resizeObserver = new ResizeObserver(() => {
        resize();
      });
      resizeObserver.observe(canvas);

      const onVisibilityChange = () => {
        visible = document.visibilityState === 'visible';
      };
      document.addEventListener('visibilitychange', onVisibilityChange);

      const render = (now: number) => {
        if (disposed) return;

        animationFrame = window.requestAnimationFrame(render);

        if (!runningRef.current || !visible) {
          return;
        }

        if (now - lastRenderTime < FRAME_INTERVAL) {
          return;
        }
        lastRenderTime = now;

        resize();
        gl.useProgram(activeProgram);
        gl.bindVertexArray(vao);
        gl.uniform2f(builtinUniforms.resolution, canvas.width, canvas.height);
        gl.uniform1f(builtinUniforms.time, (now - startedAt) / 1000);
        gl.uniform2f(builtinUniforms.pointer, pointerRef.current.x, pointerRef.current.y);
        gl.uniform1f(builtinUniforms.frame, frame);

        for (const [key, location] of controlUniforms.entries()) {
          if (!location) continue;
          gl.uniform1f(location, valuesRef.current[key] ?? 0);
        }

        gl.drawArrays(gl.TRIANGLES, 0, 3);
        frame += 1;
        frameBatch += 1;

        const elapsed = now - lastFpsTime;
        if (elapsed >= 350) {
          setFps(Math.round((frameBatch * 1000) / elapsed));
          frameBatch = 0;
          lastFpsTime = now;
        }
      };

      animationFrame = window.requestAnimationFrame(render);
      setCapability('ready');
      setMessage('');

      return () => {
        disposed = true;
        window.cancelAnimationFrame(animationFrame);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        resizeObserver?.disconnect();
        if (vao) gl.deleteVertexArray(vao);
        if (program) gl.deleteProgram(program);
      };
    } catch (error) {
      resizeObserver?.disconnect();
      if (vao) {
        const gl = canvas.getContext('webgl2');
        gl?.deleteVertexArray(vao);
      }
      if (program) {
        const gl = canvas.getContext('webgl2');
        gl?.deleteProgram(program);
      }
      setCapability('error');
      setMessage(error instanceof Error ? error.message : 'Shader compilation failed.');
      return;
    }
  }, [definition]);

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/12 bg-[#050816] shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(120,119,198,0.12),_transparent_32%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.08),_transparent_24%)]" />
      <canvas
        ref={canvasRef}
        className="relative block h-full min-h-[360px] w-full touch-none"
        style={{ height: definition.canvasHeight ?? 480 }}
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          pointerRef.current = {
            x: (event.clientX - rect.left) / rect.width,
            y: 1 - (event.clientY - rect.top) / rect.height,
          };
        }}
        onPointerLeave={() => {
          pointerRef.current = buildDefaultPointer();
        }}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 p-4 font-mono text-[11px] uppercase tracking-[0.24em] text-white/60">
        <span>{isRunning ? `${fps} fps` : 'paused'}</span>
      </div>

      {capability !== 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/72 p-6 text-center text-sm leading-relaxed text-white/85">
          <p>{message}</p>
        </div>
      )}
    </div>
  );
}
