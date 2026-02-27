'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface Params {
  blur: number;
  distortion: number;
  turbulence: number;
  specular: number;
  panelSize: number;
}

const DEFAULT_PARAMS: Params = {
  blur: 4,
  distortion: 30,
  turbulence: 0.015,
  specular: 0.75,
  panelSize: 280,
};

const PRESETS: { label: string; value: Params }[] = [
  { label: 'Subtle', value: { blur: 2, distortion: 12, turbulence: 0.01, specular: 0.4, panelSize: 260 } },
  { label: 'Default', value: DEFAULT_PARAMS },
  { label: 'Wavy', value: { blur: 3, distortion: 50, turbulence: 0.025, specular: 0.6, panelSize: 300 } },
  { label: 'Crystal', value: { blur: 6, distortion: 8, turbulence: 0.005, specular: 1.2, panelSize: 320 } },
  { label: 'Molten', value: { blur: 5, distortion: 80, turbulence: 0.04, specular: 0.9, panelSize: 240 } },
];

const SLIDERS: { key: keyof Params; label: string; min: number; max: number; step: number }[] = [
  { key: 'blur', label: 'Blur', min: 0, max: 20, step: 0.5 },
  { key: 'distortion', label: 'Distortion', min: 0, max: 120, step: 1 },
  { key: 'turbulence', label: 'Turbulence', min: 0.001, max: 0.08, step: 0.001 },
  { key: 'specular', label: 'Specular', min: 0, max: 2, step: 0.05 },
  { key: 'panelSize', label: 'Panel Size', min: 120, max: 500, step: 10 },
];

export default function LiquidGlass() {
  const [params, setParams] = useState<Params>(DEFAULT_PARAMS);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [panelPos, setPanelPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const targetRef = useRef({ x: 0, y: 0 });

  // Smooth mouse tracking with lerp
  const animate = useCallback(() => {
    setPanelPos((prev) => ({
      x: prev.x + (targetRef.current.x - prev.x) * 0.12,
      y: prev.y + (targetRef.current.y - prev.y) * 0.12,
    }));
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animate]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setMouse({ x, y });
      targetRef.current = {
        x: x - params.panelSize / 2,
        y: y - params.panelSize / 2,
      };
    },
    [params.panelSize],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      setMouse({ x, y });
      targetRef.current = {
        x: x - params.panelSize / 2,
        y: y - params.panelSize / 2,
      };
    },
    [params.panelSize],
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      {/* Hidden SVG filter definitions */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <filter id="liquid-glass-filter" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={params.turbulence}
              numOctaves={3}
              seed={2}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={params.distortion}
              xChannelSelector="R"
              yChannelSelector="G"
              result="distorted"
            />
            <feGaussianBlur in="distorted" stdDeviation={params.blur} result="blurred" />
            <feSpecularLighting
              in="noise"
              surfaceScale={5}
              specularConstant={params.specular}
              specularExponent={20}
              lightingColor="#ffffff"
              result="specular"
            >
              <fePointLight x={mouse.x} y={mouse.y} z={200} />
            </feSpecularLighting>
            <feComposite in="specular" in2="SourceGraphic" operator="in" result="specular-shape" />
            <feComposite in="blurred" in2="specular-shape" operator="arithmetic" k1={0} k2={1} k3={0.6} k4={0} />
          </filter>
        </defs>
      </svg>

      <a
        href="/"
        className="mb-6 inline-block font-mono text-xs text-muted transition-colors hover:text-fg"
      >
        ← back
      </a>
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Liquid Glass</h1>
      <p className="mt-1 text-sm text-muted">
        Apple-inspired Liquid Glass effect using SVG filters. Move your cursor over the canvas.
      </p>

      <p className="mt-2 rounded bg-yellow-500/10 px-3 py-1.5 text-xs text-yellow-600 dark:text-yellow-400">
        Best experienced in Chrome/Edge. Other browsers may render the effect differently due to SVG filter support.
      </p>

      {/* Canvas area */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        className="relative mt-6 h-[500px] w-full cursor-none select-none overflow-hidden rounded-xl border border-white/10"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)',
        }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute left-[10%] top-[15%] h-40 w-40 rounded-full opacity-70"
          style={{ background: 'radial-gradient(circle, #ff6b6b, transparent 70%)' }}
        />
        <div
          className="absolute right-[15%] top-[20%] h-52 w-52 rounded-full opacity-60"
          style={{ background: 'radial-gradient(circle, #48dbfb, transparent 70%)' }}
        />
        <div
          className="absolute bottom-[15%] left-[25%] h-44 w-44 rounded-full opacity-65"
          style={{ background: 'radial-gradient(circle, #feca57, transparent 70%)' }}
        />
        <div
          className="absolute bottom-[10%] right-[20%] h-36 w-36 rounded-full opacity-70"
          style={{ background: 'radial-gradient(circle, #ff9ff3, transparent 70%)' }}
        />
        <div
          className="absolute left-[50%] top-[50%] h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50"
          style={{ background: 'radial-gradient(circle, #54a0ff, transparent 70%)' }}
        />

        {/* Decorative shapes */}
        <div className="absolute left-[60%] top-[10%] h-20 w-20 rotate-45 rounded-lg bg-white/15" />
        <div className="absolute bottom-[25%] left-[8%] h-16 w-16 rounded-full border-4 border-white/20" />
        <div className="absolute right-[10%] top-[60%] h-0 w-0 border-l-[25px] border-r-[25px] border-b-[40px] border-l-transparent border-r-transparent border-b-white/15" />

        {/* Text for visual context */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-6xl font-bold text-white/25 select-none">Liquid Glass</span>
        </div>

        {/* Glass panel */}
        <div
          className="pointer-events-none absolute rounded-2xl"
          style={{
            width: params.panelSize,
            height: params.panelSize,
            transform: `translate(${panelPos.x}px, ${panelPos.y}px)`,
            willChange: 'transform',
            backdropFilter: `url(#liquid-glass-filter) blur(${params.blur}px)`,
            WebkitBackdropFilter: `url(#liquid-glass-filter) blur(${params.blur}px)`,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.3)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.3)',
          }}
        >
          {/* Inner highlight */}
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)',
            }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="mt-6 space-y-4">
        {/* Presets */}
        <div>
          <span className="mb-2 block text-xs font-medium text-muted">Presets</span>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setParams(preset.value)}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-muted transition-colors hover:bg-white/10 hover:text-fg"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sliders */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SLIDERS.map((slider) => (
            <label key={slider.key} className="block">
              <span className="mb-1 flex items-center justify-between text-xs text-muted">
                <span>{slider.label}</span>
                <span className="font-mono">{params[slider.key]}</span>
              </span>
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={params[slider.key]}
                onChange={(e) =>
                  setParams((prev) => ({ ...prev, [slider.key]: Number(e.target.value) }))
                }
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-accent"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
