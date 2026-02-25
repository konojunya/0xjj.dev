'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

interface Bezier {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const PRESETS: { label: string; value: Bezier }[] = [
  { label: 'linear', value: { x1: 0, y1: 0, x2: 1, y2: 1 } },
  { label: 'ease', value: { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 } },
  { label: 'ease-in', value: { x1: 0.42, y1: 0, x2: 1, y2: 1 } },
  { label: 'ease-out', value: { x1: 0, y1: 0, x2: 0.58, y2: 1 } },
  { label: 'ease-in-out', value: { x1: 0.42, y1: 0, x2: 0.58, y2: 1 } },
];

// de Casteljau: sample cubic bezier with control points P0=(0,0), P1=(x1,y1), P2=(x2,y2), P3=(1,1)
function sampleBezier(bezier: Bezier, steps = 100): [number, number][] {
  const { x1, y1, x2, y2 } = bezier;
  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x = 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t;
    const y = 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t;
    points.push([x, y]);
  }
  return points;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={copy}
      className="rounded px-2 py-0.5 font-mono text-xs transition-colors"
      style={{
        background: 'color-mix(in srgb, var(--color-fg) 8%, transparent)',
        color: 'var(--color-muted)',
      }}
    >
      {copied ? 'copied!' : 'copy'}
    </button>
  );
}

export default function EasingVisualizer() {
  const [bezier, setBezier] = useState<Bezier>({ x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 });
  const [playing, setPlaying] = useState(false);
  const ballRef = useRef<HTMLDivElement>(null);
  const animTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const cssValue = `cubic-bezier(${bezier.x1}, ${bezier.y1}, ${bezier.x2}, ${bezier.y2})`;

  const svgPath = useMemo(() => {
    const W = 200;
    const H = 200;
    const pad = 20;
    const plotW = W - pad * 2;
    const plotH = H - pad * 2;
    const points = sampleBezier(bezier);
    const toSvg = ([x, y]: [number, number]) =>
      `${pad + x * plotW},${pad + (1 - y) * plotH}`;
    const d = points.map((p, i) => (i === 0 ? `M ${toSvg(p)}` : `L ${toSvg(p)}`)).join(' ');

    // control point lines
    const p0 = [pad, pad + plotH];
    const p1 = [pad + bezier.x1 * plotW, pad + (1 - bezier.y1) * plotH];
    const p2 = [pad + bezier.x2 * plotW, pad + (1 - bezier.y2) * plotH];
    const p3 = [pad + plotW, pad];

    return { d, p0, p1, p2, p3 };
  }, [bezier]);

  const handlePlay = useCallback(() => {
    if (!ballRef.current) return;
    if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
    const ball = ballRef.current;
    // Reset
    ball.style.transition = 'none';
    ball.style.transform = 'translateY(0)';
    setPlaying(true);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        ball.style.transition = `transform 1s ${cssValue}`;
        ball.style.transform = 'translateY(140px)';
        animTimeoutRef.current = setTimeout(() => {
          ball.style.transition = 'none';
          ball.style.transform = 'translateY(0)';
          setPlaying(false);
        }, 1200);
      });
    });
  }, [cssValue]);

  const setParam = (key: keyof Bezier, val: number) => {
    setBezier((b) => ({ ...b, [key]: Math.max(0, Math.min(1, val)) }));
  };

  const numInputStyle = {
    borderColor: 'color-mix(in srgb, var(--color-fg) 12%, transparent)',
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <a
          href="/"
          className="mb-6 inline-block font-mono text-xs text-muted transition-colors hover:text-fg"
        >
          ← back
        </a>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Easing Visualizer</h1>
        <p className="mt-1 text-sm text-muted">
          Visualize and preview cubic-bezier easing curves for CSS.
        </p>
      </div>

      {/* Presets */}
      <div className="mb-4 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => setBezier(p.value)}
            className="rounded-lg border px-3 py-1 font-mono text-xs transition-colors"
            style={
              JSON.stringify(bezier) === JSON.stringify(p.value)
                ? { borderColor: 'var(--color-fg)', background: 'var(--color-fg)', color: 'var(--color-bg)' }
                : { borderColor: 'color-mix(in srgb, var(--color-fg) 12%, transparent)', color: 'var(--color-muted)' }
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Number inputs */}
      <div className="mb-6 grid grid-cols-4 gap-3">
        {(['x1', 'y1', 'x2', 'y2'] as (keyof Bezier)[]).map((key) => (
          <div key={key}>
            <label className="mb-1 block font-mono text-xs text-muted">{key}</label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={bezier[key]}
              onChange={(e) => setParam(key, parseFloat(e.target.value) || 0)}
              className="w-full rounded-lg border bg-transparent px-3 py-2 font-mono text-sm text-fg outline-none"
              style={numInputStyle}
            />
          </div>
        ))}
      </div>

      {/* Preview row */}
      <div className="mb-6 flex flex-wrap items-start gap-8">
        {/* SVG curve */}
        <div>
          <p className="mb-2 font-mono text-xs text-muted">Curve</p>
          <svg
            width={200}
            height={200}
            className="rounded-lg border"
            style={{ borderColor: 'color-mix(in srgb, var(--color-fg) 12%, transparent)' }}
          >
            {/* Grid */}
            <line x1={20} y1={20} x2={20} y2={180} stroke="currentColor" strokeOpacity={0.1} />
            <line x1={20} y1={180} x2={180} y2={180} stroke="currentColor" strokeOpacity={0.1} />
            <line x1={20} y1={20} x2={180} y2={20} stroke="currentColor" strokeOpacity={0.1} />
            <line x1={180} y1={20} x2={180} y2={180} stroke="currentColor" strokeOpacity={0.1} />

            {/* Control point lines */}
            <line
              x1={svgPath.p0[0]} y1={svgPath.p0[1]}
              x2={svgPath.p1[0]} y2={svgPath.p1[1]}
              stroke="currentColor" strokeOpacity={0.3} strokeDasharray="3,3"
            />
            <line
              x1={svgPath.p3[0]} y1={svgPath.p3[1]}
              x2={svgPath.p2[0]} y2={svgPath.p2[1]}
              stroke="currentColor" strokeOpacity={0.3} strokeDasharray="3,3"
            />

            {/* Curve */}
            <path d={svgPath.d} fill="none" stroke="var(--color-accent)" strokeWidth={2.5} />

            {/* Control points */}
            <circle cx={svgPath.p1[0]} cy={svgPath.p1[1]} r={4} fill="var(--color-accent)" fillOpacity={0.7} />
            <circle cx={svgPath.p2[0]} cy={svgPath.p2[1]} r={4} fill="var(--color-accent)" fillOpacity={0.7} />
            <circle cx={svgPath.p0[0]} cy={svgPath.p0[1]} r={3} fill="currentColor" />
            <circle cx={svgPath.p3[0]} cy={svgPath.p3[1]} r={3} fill="currentColor" />
          </svg>
        </div>

        {/* Animation preview */}
        <div>
          <p className="mb-2 font-mono text-xs text-muted">Preview</p>
          <div
            className="relative flex items-start justify-center rounded-lg border"
            style={{
              width: 80,
              height: 200,
              borderColor: 'color-mix(in srgb, var(--color-fg) 12%, transparent)',
            }}
          >
            <div
              ref={ballRef}
              className="mt-4 h-8 w-8 rounded-full"
              style={{ background: 'var(--color-accent)' }}
            />
          </div>
          <button
            onClick={handlePlay}
            disabled={playing}
            className="mt-2 w-full rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-fg) 12%, transparent)',
              color: playing ? 'var(--color-muted)' : 'var(--color-fg)',
            }}
          >
            {playing ? 'Playing...' : 'Play'}
          </button>
        </div>
      </div>

      {/* CSS value */}
      <div
        className="flex items-center justify-between rounded-lg border px-3 py-2"
        style={{
          borderColor: 'color-mix(in srgb, var(--color-fg) 12%, transparent)',
          background: 'color-mix(in srgb, var(--color-fg) 4%, transparent)',
        }}
      >
        <code className="font-mono text-sm text-fg">{cssValue}</code>
        <CopyButton text={cssValue} />
      </div>
    </main>
  );
}
