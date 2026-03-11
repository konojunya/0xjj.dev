'use client';

import { useEffect, useRef, useState } from 'react';
import type { OGLSceneDefinition, ShaderControlValues } from './types';

interface OGLCanvasProps {
  definition: OGLSceneDefinition;
  values: ShaderControlValues;
  isRunning: boolean;
}

function buildDefaultPointer(): { x: number; y: number } {
  return { x: 0.5, y: 0.5 };
}

export function OGLCanvas({ definition, values, isRunning }: OGLCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const valuesRef = useRef(values);
  const runningRef = useRef(isRunning);
  const pointerRef = useRef(buildDefaultPointer());
  const [error, setError] = useState<string>('');
  const [fps, setFps] = useState<number>(0);

  valuesRef.current = values;
  runningRef.current = isRunning;

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

    try {
      const handle = definition.setup({
        canvas,
        getValues: () => valuesRef.current,
        getPointer: () => pointerRef.current,
      });

      const onVisibilityChange = () => {
        visible = document.visibilityState === 'visible';
      };
      document.addEventListener('visibilitychange', onVisibilityChange);

      let prevTime = 0;

      const loop = (now: number) => {
        if (disposed) return;
        animationFrame = window.requestAnimationFrame(loop);

        if (!runningRef.current || !visible) return;
        if (now - lastRenderTime < FRAME_INTERVAL) return;
        lastRenderTime = now;

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
      setError('');

      return () => {
        disposed = true;
        window.cancelAnimationFrame(animationFrame);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        handle.dispose();
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : 'OGL シーンの初期化に失敗しました。');
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
        <span>{isRunning ? `${fps} fps` : '停止中'}</span>
      </div>

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/72 p-6 text-center text-sm leading-relaxed text-white/85">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
