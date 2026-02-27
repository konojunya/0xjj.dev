'use client';

import { useCallback, useRef, useState } from 'react';

const GLASS_W = 210;
const GLASS_H = 150;
const BORDER_RADIUS = 75;
const DISPLACEMENT_SCALE = 98;
const MAGNIFY_SCALE = 24;
const SATURATION = 9;
const SPECULAR_OPACITY = 0.5;

export default function LiquidGlass() {
  const [pos, setPos] = useState({ x: 24, y: 24 });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pos],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <a
        href="/"
        className="mb-6 inline-block font-mono text-xs text-muted transition-colors hover:text-fg"
      >
        ← back
      </a>
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Liquid Glass</h1>
      <p className="mt-1 text-sm text-muted">
        Drag the capsule to bend the page. SVG displacement filter refracts whatever sits beneath it.
      </p>
      <p className="mt-2 rounded bg-yellow-500/10 px-3 py-1.5 text-xs text-yellow-600 dark:text-yellow-400">
        Requires Chrome / Edge. backdrop-filter + SVG filter is not supported in Firefox / Safari.
      </p>

      {/* Demo area */}
      <div className="relative mt-6 h-[440px] overflow-hidden rounded-xl border border-black/10 bg-white select-none dark:border-white/10 dark:bg-black sm:h-[460px]">
        {/* Background scene */}
        <div className="absolute inset-0 grid grid-cols-1 gap-6 p-6 sm:grid-cols-[1fr_46%] sm:gap-10 sm:p-10">
          {/* Left: text */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-3 text-violet-600 dark:text-violet-400">
              <span className="h-[2px] w-10 bg-current" />
              <span className="text-[11px] font-medium uppercase tracking-[0.25em]">UI Lab</span>
            </div>
            <h3 className="mt-4 text-[36px] font-extrabold leading-[0.95] tracking-tight text-black sm:text-[54px] dark:text-white">
              Liquid&nbsp;Glass Demo
            </h3>
            <div className="mt-4 max-w-[60ch] space-y-3 text-[15px] leading-[1.55] text-black/70 sm:text-[16px] dark:text-white/70">
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
                exercitation ullamco laboris.
              </p>
              <p>
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
                fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.
              </p>
              <p className="text-black/60 dark:text-white/60">
                Sunt in culpa qui officia deserunt mollit anim id est laborum.
              </p>
            </div>
          </div>
          {/* Right: background image */}
          <div className="relative hidden overflow-hidden rounded-lg ring-1 ring-black/10 sm:block dark:ring-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/liquid-glass/bg.png"
              alt="JJ logo"
              loading="lazy"
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </div>

        {/* Draggable glass element */}
        <div
          className="absolute z-10 cursor-grab active:cursor-grabbing"
          draggable={false}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          style={{
            left: pos.x,
            top: pos.y,
            width: GLASS_W,
            height: GLASS_H,
            borderRadius: BORDER_RADIUS,
            transform: 'scaleY(0.8)',
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          {/* SVG filter (hidden) */}
          <svg colorInterpolationFilters="sRGB" style={{ display: 'none' }}>
            <defs>
              <filter id="liquid-glass-filter">
                {/* Magnification displacement */}
                <feImage
                  href="/liquid-glass/magnifying-map.png"
                  x={0} y={0}
                  width={GLASS_W} height={GLASS_H}
                  result="magnifying_displacement_map"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="magnifying_displacement_map"
                  scale={MAGNIFY_SCALE}
                  xChannelSelector="R"
                  yChannelSelector="G"
                  result="magnified_source"
                />
                <feGaussianBlur
                  in="magnified_source"
                  stdDeviation={0}
                  result="blurred_source"
                />
                {/* Refraction displacement */}
                <feImage
                  href="/liquid-glass/displacement-map.png"
                  x={0} y={0}
                  width={GLASS_W} height={GLASS_H}
                  result="displacement_map"
                />
                <feDisplacementMap
                  in="blurred_source"
                  in2="displacement_map"
                  scale={DISPLACEMENT_SCALE}
                  xChannelSelector="R"
                  yChannelSelector="G"
                  result="displaced"
                />
                {/* Saturation boost */}
                <feColorMatrix
                  in="displaced"
                  type="saturate"
                  values={String(SATURATION)}
                  result="displaced_saturated"
                />
                {/* Specular highlight */}
                <feImage
                  href="/liquid-glass/specular-map.png"
                  x={0} y={0}
                  width={GLASS_W} height={GLASS_H}
                  result="specular_layer"
                />
                <feComposite
                  in="displaced_saturated"
                  in2="specular_layer"
                  operator="in"
                  result="specular_saturated"
                />
                <feComponentTransfer in="specular_layer" result="specular_faded">
                  <feFuncA type="linear" slope={SPECULAR_OPACITY} />
                </feComponentTransfer>
                {/* Blend layers */}
                <feBlend
                  in="specular_saturated"
                  in2="displaced"
                  mode="normal"
                  result="withSaturation"
                />
                <feBlend
                  in="specular_faded"
                  in2="withSaturation"
                  mode="normal"
                />
              </filter>
            </defs>
          </svg>

          {/* Glass surface */}
          <div
            className="absolute inset-0 ring-1 ring-black/10 dark:ring-white/10"
            style={{
              borderRadius: BORDER_RADIUS,
              backdropFilter: 'url(#liquid-glass-filter)',
              WebkitBackdropFilter: 'url(#liquid-glass-filter)',
              boxShadow: `0px 4px 9px rgba(0,0,0,0.16),
      inset 0px 2px 24px rgba(0,0,0,0.2),
      inset 0px -2px 24px rgba(255,255,255,0.2)`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
