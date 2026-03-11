'use client';

import { useEffect, useRef, useState } from 'react';
import type { WebGPUDefinition, ShaderControlValues } from './types';

interface WebGPUCanvasProps {
  definition: WebGPUDefinition;
  values: ShaderControlValues;
  isRunning: boolean;
  resetKey: number;
}

function buildDefaultPointer(): { x: number; y: number } {
  return { x: 0.5, y: 0.5 };
}

export function WebGPUCanvas({ definition, values, isRunning, resetKey }: WebGPUCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const valuesRef = useRef(values);
  const runningRef = useRef(isRunning);
  const pointerRef = useRef(buildDefaultPointer());
  const handleRef = useRef<{ render: (t: number, dt: number) => void; dispose: () => void; reset?: () => void } | null>(null);
  const [error, setError] = useState<string>('');
  const [fps, setFps] = useState<number>(0);
  const prevResetKeyRef = useRef(resetKey);

  valuesRef.current = values;
  runningRef.current = isRunning;

  // Call handle.reset() when resetKey changes
  if (resetKey !== prevResetKeyRef.current) {
    prevResetKeyRef.current = resetKey;
    handleRef.current?.reset?.();
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let animationFrame = 0;
    let frameBatch = 0;
    let lastFpsTime = performance.now();
    const startedAt = performance.now();
    let visible = true;

    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    const TARGET_FPS = isMobile ? 30 : 60;
    const FRAME_INTERVAL = 1000 / TARGET_FPS;
    let lastRenderTime = 0;

    async function init() {
      if (!navigator.gpu) {
        setError('WebGPU is not available. Requires HTTPS and a supported browser (Chrome, Edge, Safari 17+).');
        return;
      }

      let adapter: GPUAdapter | null = null;
      try {
        // Try without powerPreference first (Safari may reject options)
        adapter = await navigator.gpu.requestAdapter();
      } catch (e) {
        setError('Failed to initialize WebGPU adapter.');
        return;
      }
      if (!adapter) {
        setError('WebGPU adapter not available.');
        return;
      }

      let device: GPUDevice;
      try {
        device = await adapter.requestDevice({});
      } catch (e) {
        setError('Failed to get WebGPU device.');
        return;
      }

      const context = canvas.getContext('webgpu');
      if (!context) {
        setError('Failed to get WebGPU canvas context.');
        return;
      }

      const format = navigator.gpu.getPreferredCanvasFormat();
      context.configure({ device, format, alphaMode: 'opaque' });

      // Resize
      function resize() {
        const rect = canvas.getBoundingClientRect();
        const maxDpr = isMobile ? 1.5 : 2;
        const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
        const w = Math.max(1, Math.round(rect.width * dpr));
        const h = Math.max(1, Math.round(rect.height * dpr));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          context.configure({ device, format, alphaMode: 'opaque' });
        }
      }
      resize();

      const resizeObserver = new ResizeObserver(() => resize());
      resizeObserver.observe(canvas);

      const onVisibilityChange = () => {
        visible = document.visibilityState === 'visible';
      };
      document.addEventListener('visibilitychange', onVisibilityChange);

      let handle: { render: (t: number, dt: number) => void; dispose: () => void; reset?: () => void };
      try {
        handle = await definition.setup({
          canvas,
          device,
          format,
          getValues: () => valuesRef.current,
          getPointer: () => pointerRef.current,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to initialize WebGPU scene.');
        return;
      }

      handleRef.current = handle;
      setError('');
      let prevTime = 0;

      const loop = (now: number) => {
        if (disposed) return;
        animationFrame = window.requestAnimationFrame(loop);

        if (!runningRef.current || !visible) return;
        if (now - lastRenderTime < FRAME_INTERVAL) return;
        lastRenderTime = now;

        resize();
        const t = (now - startedAt) / 1000;
        const dt = t - prevTime;
        prevTime = t;

        handle.render(t, dt);

        frameBatch += 1;
        const elapsed = now - lastFpsTime;
        if (elapsed >= 350) {
          setFps(Math.round((frameBatch * 1000) / elapsed));
          frameBatch = 0;
          lastFpsTime = now;
        }
      };

      animationFrame = window.requestAnimationFrame(loop);

      return () => {
        disposed = true;
        window.cancelAnimationFrame(animationFrame);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        resizeObserver.disconnect();
        handle.dispose();
        device.destroy();
      };
    }

    let cleanup: (() => void) | undefined;
    init()
      .then((fn) => {
        cleanup = fn;
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'An unexpected error occurred.');
      });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      cleanup?.();
    };
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

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/72 p-6 text-center text-sm leading-relaxed text-white/85">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
