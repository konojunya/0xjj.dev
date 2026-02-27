'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Globe, AlarmClock, Timer, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const NAV_ITEMS: { icon: LucideIcon; label: string }[] = [
  { icon: Globe, label: 'World' },
  { icon: AlarmClock, label: 'Alarm' },
  { icon: Timer, label: 'Stopwatch' },
  { icon: Clock, label: 'Timer' },
];

/** Glass indicator dimensions */
const GLASS_W = 90;
const GLASS_H = 56;
const GLASS_R = 22;

const MAP_SRCS = ['/liquid-glass/zoom.png', '/liquid-glass/refract.png', '/liquid-glass/highlight.png'];

export default function FloatingNavDemo() {
  const [active, setActive] = useState(0);
  const [mapsReady, setMapsReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const navRef = useRef<HTMLElement>(null);
  const offsetRef = useRef(0);
  const itemPositions = useRef<{ center: number; left: number; width: number }[]>([]);

  // Preload displacement maps
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

  // Measure item positions
  useEffect(() => {
    if (!navRef.current) return;
    const buttons = navRef.current.querySelectorAll<HTMLButtonElement>('[data-nav-item]');
    const navRect = navRef.current.getBoundingClientRect();
    itemPositions.current = Array.from(buttons).map((btn) => {
      const r = btn.getBoundingClientRect();
      const left = r.left - navRect.left;
      return { left, width: r.width, center: left + r.width / 2 };
    });
  }, [mapsReady]);

  const getSnapX = useCallback((idx: number) => {
    const pos = itemPositions.current[idx];
    if (!pos) return 0;
    return pos.center - GLASS_W / 2;
  }, []);

  const indicatorX = dragging ? dragX : getSnapX(active);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      setDragging(true);
      const currentX = getSnapX(active);
      offsetRef.current = e.clientX - currentX;
      setDragX(currentX);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [active, getSnapX],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const nav = navRef.current;
      if (!nav) return;
      const x = e.clientX - offsetRef.current;
      const maxX = nav.offsetWidth - GLASS_W;
      setDragX(Math.max(0, Math.min(x, maxX)));
    },
    [dragging],
  );

  const onPointerUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    // Snap to nearest tab
    const centerX = dragX + GLASS_W / 2;
    let closest = 0;
    let minDist = Infinity;
    itemPositions.current.forEach((pos, i) => {
      const dist = Math.abs(pos.center - centerX);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });
    setActive(closest);
  }, [dragging, dragX]);

  return (
    <section className="mt-16">
      <h2 className="text-xl font-bold tracking-tight text-fg">UI Example: Floating Navigation</h2>
      <p className="mt-2 text-sm text-muted">
        Drag the glass indicator across tabs — icons refract through the liquid glass as it moves.
      </p>

      <div className="relative mt-4 flex h-[200px] items-center justify-center overflow-hidden rounded-xl bg-[#1c1c1e]">
        {/* Colored background shapes so refraction is visible */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[8%] top-[10%] h-32 w-32 rounded-full bg-orange-500/20 blur-2xl" />
          <div className="absolute right-[12%] bottom-[15%] h-40 w-40 rounded-full bg-purple-500/15 blur-2xl" />
          <div className="absolute left-[40%] bottom-[20%] h-28 w-28 rounded-full bg-blue-500/15 blur-2xl" />
        </div>

        <nav
          ref={navRef}
          className="relative flex items-center rounded-[28px] p-1.5"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '0.5px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Draggable glass indicator */}
          {mapsReady && (
            <div
              className="absolute z-10 cursor-grab active:cursor-grabbing"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              style={{
                left: indicatorX,
                top: 6,
                width: GLASS_W,
                height: GLASS_H,
                borderRadius: GLASS_R,
                transition: dragging ? 'none' : 'left 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                touchAction: 'none',
                userSelect: 'none',
              }}
            >
              <svg colorInterpolationFilters="sRGB" style={{ display: 'none' }}>
                <defs>
                  <filter id="nav-glass">
                    <feImage href="/liquid-glass/zoom.png" x={0} y={0} width={GLASS_W} height={GLASS_H} result="zm" />
                    <feDisplacementMap in="SourceGraphic" in2="zm" scale={16} xChannelSelector="R" yChannelSelector="G" result="zoomed" />
                    <feImage href="/liquid-glass/refract.png" x={0} y={0} width={GLASS_W} height={GLASS_H} result="rf" />
                    <feDisplacementMap in="zoomed" in2="rf" scale={60} xChannelSelector="R" yChannelSelector="G" result="bent" />
                    <feColorMatrix in="bent" type="saturate" values="6" result="vivid" />
                    <feImage href="/liquid-glass/highlight.png" x={0} y={0} width={GLASS_W} height={GLASS_H} result="hl" />
                    <feComposite in="vivid" in2="hl" operator="in" result="hl-sat" />
                    <feComponentTransfer in="hl" result="hl-fade">
                      <feFuncA type="linear" slope={0.4} />
                    </feComponentTransfer>
                    <feBlend in="hl-sat" in2="bent" mode="normal" result="merged" />
                    <feBlend in="hl-fade" in2="merged" mode="normal" />
                  </filter>
                </defs>
              </svg>
              <div
                className="absolute inset-0"
                style={{
                  borderRadius: GLASS_R,
                  backdropFilter: 'url(#nav-glass)',
                  WebkitBackdropFilter: 'url(#nav-glass)',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 100%)',
                  boxShadow:
                    'inset 0 0.5px 0 rgba(255,255,255,0.3), inset 0 -0.5px 0 rgba(255,255,255,0.06), 0 4px 16px rgba(0,0,0,0.4)',
                  border: '0.5px solid rgba(255,255,255,0.18)',
                }}
              />
            </div>
          )}

          {/* Nav items */}
          {NAV_ITEMS.map((item, i) => {
            const Icon = item.icon;
            const isActive = active === i;
            return (
              <button
                key={item.label}
                type="button"
                data-nav-item
                onClick={() => !dragging && setActive(i)}
                className="relative z-20 flex flex-col items-center gap-1 px-5 py-2"
              >
                <Icon
                  size={24}
                  strokeWidth={isActive ? 2.2 : 1.5}
                  className={`transition-colors duration-300 ${isActive ? 'text-orange-400' : 'text-white/40'}`}
                />
                <span
                  className={`text-[11px] font-medium transition-colors duration-300 ${isActive ? 'text-orange-400' : 'text-white/40'}`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </section>
  );
}
