'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const W = 210;
const H = 150;
const R = 75;

const MAP_SRCS = ['/liquid-glass/zoom.png', '/liquid-glass/refract.png', '/liquid-glass/highlight.png'];

export default function Demo() {
  const [pos, setPos] = useState({ x: 24, y: 24 });
  const [mapsReady, setMapsReady] = useState(false);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      MAP_SRCS.map(
        (src) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = src;
          }),
      ),
    ).then(() => {
      if (!cancelled) setMapsReady(true);
    });
    return () => { cancelled = true; };
  }, []);

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
    <div className="relative mt-6 h-[440px] overflow-hidden rounded-xl border border-black/10 bg-white select-none dark:border-white/10 dark:bg-black sm:h-[460px]">
      {/* Background scene */}
      <div className="absolute inset-0 grid grid-cols-1 gap-6 p-6 sm:grid-cols-[1fr_46%] sm:gap-10 sm:p-10">
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

      {/* Draggable glass */}
      {mapsReady && (
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
            width: W,
            height: H,
            borderRadius: R,
            transform: 'scaleY(0.8)',
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          <svg colorInterpolationFilters="sRGB" style={{ display: 'none' }}>
            <defs>
              <filter id="glass-refract">
                <feImage href="/liquid-glass/zoom.png" x={0} y={0} width={W} height={H} result="zm" />
                <feDisplacementMap in="SourceGraphic" in2="zm" scale={24} xChannelSelector="R" yChannelSelector="G" result="zoomed" />
                <feImage href="/liquid-glass/refract.png" x={0} y={0} width={W} height={H} result="rf" />
                <feDisplacementMap in="zoomed" in2="rf" scale={98} xChannelSelector="R" yChannelSelector="G" result="bent" />
                <feColorMatrix in="bent" type="saturate" values="9" result="vivid" />
                <feImage href="/liquid-glass/highlight.png" x={0} y={0} width={W} height={H} result="hl" />
                <feComposite in="vivid" in2="hl" operator="in" result="hl-sat" />
                <feComponentTransfer in="hl" result="hl-fade">
                  <feFuncA type="linear" slope={0.5} />
                </feComponentTransfer>
                <feBlend in="hl-sat" in2="bent" mode="normal" result="merged" />
                <feBlend in="hl-fade" in2="merged" mode="normal" />
              </filter>
            </defs>
          </svg>
          <div
            className="absolute inset-0 ring-1 ring-black/10 dark:ring-white/10"
            style={{
              borderRadius: R,
              backdropFilter: 'url(#glass-refract)',
              WebkitBackdropFilter: 'url(#glass-refract)',
              boxShadow:
                '0 4px 9px rgba(0,0,0,.16), inset 0 2px 24px rgba(0,0,0,.2), inset 0 -2px 24px rgba(255,255,255,.2)',
            }}
          />
        </div>
      )}
    </div>
  );
}
