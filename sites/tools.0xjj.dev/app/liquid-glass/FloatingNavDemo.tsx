'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Globe, AlarmClock, Timer, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ITEMS: { icon: LucideIcon; label: string }[] = [
  { icon: Globe, label: 'World' },
  { icon: AlarmClock, label: 'Alarm' },
  { icon: Timer, label: 'Stopwatch' },
  { icon: Clock, label: 'Timer' },
];

/** Glass indicator size — matches one tab item */
const GW = 100;
const GH = 68;
const GR = 50;

const MAP_SRCS = ['/liquid-glass/zoom.png', '/liquid-glass/refract.png', '/liquid-glass/highlight.png'];

export default function FloatingNavDemo() {
  const [active, setActive] = useState(0);
  const [mapsReady, setMapsReady] = useState(false);
  const [, forceRender] = useState(0);
  const navRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const itemCenters = useRef<number[]>([]);
  const isDraggingRef = useRef(false);
  const dragXRef = useRef<number | null>(null);

  // Preload maps
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      MAP_SRCS.map(
        (src) => new Promise<void>((res) => {
          const img = new Image();
          img.onload = () => res();
          img.onerror = () => res();
          img.src = src;
        }),
      ),
    ).then(() => { if (!cancelled) setMapsReady(true); });
    return () => { cancelled = true; };
  }, []);

  // Measure tab centers
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const btns = nav.querySelectorAll<HTMLButtonElement>('[data-item]');
    const navLeft = nav.getBoundingClientRect().left;
    itemCenters.current = Array.from(btns).map((b) => {
      const r = b.getBoundingClientRect();
      return r.left - navLeft + r.width / 2;
    });
  }, [mapsReady]);

  const snapX = (i: number) => (itemCenters.current[i] ?? 0) - GW / 2;
  const glassLeft = isDraggingRef.current ? (dragXRef.current ?? 0) : snapX(active);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    glassRef.current?.setPointerCapture(e.pointerId);
    const currentSnap = snapX(active);
    offsetRef.current = e.clientX - currentSnap;
    isDraggingRef.current = true;
    dragXRef.current = currentSnap;
    forceRender((n) => n + 1);
  }, [active]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const nav = navRef.current;
    if (!nav) return;
    const x = e.clientX - offsetRef.current;
    dragXRef.current = Math.max(0, Math.min(x, nav.offsetWidth - GW));
    forceRender((n) => n + 1);
  }, []);

  const onPointerUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    const cx = (dragXRef.current ?? 0) + GW / 2;
    let closest = 0;
    let minD = Infinity;
    itemCenters.current.forEach((c, i) => {
      const d = Math.abs(c - cx);
      if (d < minD) { minD = d; closest = i; }
    });
    isDraggingRef.current = false;
    dragXRef.current = null;
    setActive(closest);
    forceRender((n) => n + 1);
  }, []);

  return (
    <section className="mt-16">
      <h2 className="text-xl font-bold tracking-tight text-fg">UI Example: Floating Navigation</h2>
      <p className="mt-2 text-sm text-muted">
        Drag the glass indicator across tabs — the same SVG displacement filter from the demo above.
      </p>

      <div className="relative mt-4 flex h-[200px] items-center justify-center overflow-hidden rounded-xl bg-[#1c1c1e]">
        {/* Nav bar */}
        <div
          ref={navRef}
          className="relative flex items-stretch rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', padding: 4 }}
        >
          {/* Tab items */}
          {ITEMS.map((item, i) => {
            const Icon = item.icon;
            const isActive = active === i;
            return (
              <button
                key={item.label}
                type="button"
                data-item
                onClick={() => { if (!isDraggingRef.current) setActive(i); }}
                className="relative z-10 flex flex-col items-center gap-1 px-6 py-3"
              >
                <Icon
                  size={24}
                  strokeWidth={isActive ? 2 : 1.5}
                  className={`transition-colors duration-300 ${isActive ? 'text-orange-400' : 'text-white/40'}`}
                />
                <span className={`text-[11px] font-medium transition-colors duration-300 ${isActive ? 'text-orange-400' : 'text-white/40'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Glass indicator — above buttons so backdrop-filter refracts the icons/text */}
          {mapsReady && (
            <div
              ref={glassRef}
              className="absolute z-20 cursor-grab touch-none select-none active:cursor-grabbing"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              draggable={false}
              style={{
                left: glassLeft,
                top: 4,
                width: GW,
                height: GH,
                borderRadius: GR,
                overflow: 'hidden',
                transition: isDraggingRef.current ? 'none' : 'left 0.45s cubic-bezier(0.32, 0.72, 0, 1)',
              }}
            >
              {/* SVG filters — nav-glass (static) / nav-glass-drag (with zoom) */}
              <svg colorInterpolationFilters="sRGB" style={{ display: 'none' }}>
                <defs>
                  <filter id="nav-glass">
                    <feImage href="/liquid-glass/refract.png" x={0} y={0} width={GW} height={GH} result="rf" />
                    <feDisplacementMap in="SourceGraphic" in2="rf" scale={98} xChannelSelector="R" yChannelSelector="G" result="bent" />
                    <feColorMatrix in="bent" type="saturate" values="9" result="vivid" />
                    <feImage href="/liquid-glass/highlight.png" x={0} y={0} width={GW} height={GH} result="hl" />
                    <feComposite in="vivid" in2="hl" operator="in" result="hl-sat" />
                    <feComponentTransfer in="hl" result="hl-fade">
                      <feFuncA type="linear" slope={0.5} />
                    </feComponentTransfer>
                    <feBlend in="hl-sat" in2="bent" mode="normal" result="merged" />
                    <feBlend in="hl-fade" in2="merged" mode="normal" />
                  </filter>
                  <filter id="nav-glass-drag">
                    <feImage href="/liquid-glass/zoom.png" x={0} y={0} width={GW} height={GH} result="zm" />
                    <feDisplacementMap in="SourceGraphic" in2="zm" scale={24} xChannelSelector="R" yChannelSelector="G" result="zoomed" />
                    <feImage href="/liquid-glass/refract.png" x={0} y={0} width={GW} height={GH} result="rf" />
                    <feDisplacementMap in="zoomed" in2="rf" scale={98} xChannelSelector="R" yChannelSelector="G" result="bent" />
                    <feColorMatrix in="bent" type="saturate" values="9" result="vivid" />
                    <feImage href="/liquid-glass/highlight.png" x={0} y={0} width={GW} height={GH} result="hl" />
                    <feComposite in="vivid" in2="hl" operator="in" result="hl-sat" />
                    <feComponentTransfer in="hl" result="hl-fade">
                      <feFuncA type="linear" slope={0.5} />
                    </feComponentTransfer>
                    <feBlend in="hl-sat" in2="bent" mode="normal" result="merged" />
                    <feBlend in="hl-fade" in2="merged" mode="normal" />
                  </filter>
                </defs>
              </svg>
              {/* Glass surface */}
              <div
                className="pointer-events-none absolute inset-0 ring-1 ring-white/10"
                style={{
                  borderRadius: GR,
                  backdropFilter: isDraggingRef.current ? 'url(#nav-glass-drag)' : 'url(#nav-glass)',
                  WebkitBackdropFilter: isDraggingRef.current ? 'url(#nav-glass-drag)' : 'url(#nav-glass)',
                  boxShadow:
                    '0 4px 9px rgba(0,0,0,.16), inset 0 2px 24px rgba(0,0,0,.2), inset 0 -2px 24px rgba(255,255,255,.2)',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
