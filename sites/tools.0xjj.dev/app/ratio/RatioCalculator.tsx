'use client';

import { useState } from 'react';

// ─── math ─────────────────────────────────────────────────────────────────────

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function simplify(a: number, b: number): [number, number] {
  const g = gcd(Math.abs(a), Math.abs(b));
  return [a / g, b / g];
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function parsePositive(s: string): number | null {
  if (s.trim() === '') return null;
  const n = Number(s);
  if (isNaN(n) || n <= 0) return null;
  return n;
}

function formatNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(4).replace(/\.?0+$/, '');
}

// ─── input component ──────────────────────────────────────────────────────────

function NumInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type="number"
      min="0"
      step="any"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={[
        'w-28 rounded-lg border border-[color-mix(in_srgb,var(--color-fg)_15%,transparent)] bg-transparent px-3 py-2 font-mono text-sm text-fg outline-none placeholder:text-muted focus:border-[color-mix(in_srgb,var(--color-fg)_40%,transparent)] transition-colors',
        className ?? '',
      ].join(' ')}
    />
  );
}

// ─── section heading ──────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-muted">{children}</h2>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function RatioCalculator() {
  // Simplify section
  const [aSimp, setASimp] = useState('');
  const [bSimp, setBSimp] = useState('');

  // Calculate section
  const [ratioA, setRatioA] = useState('');
  const [ratioB, setRatioB] = useState('');
  const [calcA, setCalcA] = useState('');
  const [calcB, setCalcB] = useState('');

  // ── Simplify result ──────────────────────────────────────────────────────

  const simpA = parsePositive(aSimp);
  const simpB = parsePositive(bSimp);

  let simpResult: [number, number] | null = null;
  let simpError: string | null = null;

  if (aSimp !== '' || bSimp !== '') {
    if (simpA === null && aSimp !== '') simpError = 'a must be a positive number';
    else if (simpB === null && bSimp !== '') simpError = 'b must be a positive number';
    else if (simpA !== null && simpB !== null) simpResult = simplify(simpA, simpB);
  }

  // ── Calculate result ─────────────────────────────────────────────────────

  const rA = parsePositive(ratioA);
  const rB = parsePositive(ratioB);
  const vA = parsePositive(calcA);
  const vB = parsePositive(calcB);

  let calcError: string | null = null;
  let derivedB: number | null = null;
  let derivedA: number | null = null;

  if (ratioA !== '' || ratioB !== '' || calcA !== '' || calcB !== '') {
    if (rA === null && ratioA !== '') calcError = 'Ratio left must be a positive number';
    else if (rB === null && ratioB !== '') calcError = 'Ratio right must be a positive number';
    else if (rA !== null && rB !== null) {
      if (vA !== null) derivedB = (vA * rB) / rA;
      if (vB !== null) derivedA = (vB * rA) / rB;
      if (vA === null && calcA !== '') calcError = 'a must be a positive number';
      else if (vB === null && calcB !== '') calcError = 'b must be a positive number';
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <a
          href="/"
          className="mb-6 inline-block font-mono text-xs text-muted transition-colors hover:text-fg"
        >
          ← back
        </a>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Ratio Calculator</h1>
        <p className="mt-1 text-sm text-muted">
          Simplify ratios and calculate missing values.
        </p>
      </div>

      {/* ── Simplify ────────────────────────────────────────────────────────── */}
      <section className="mb-10 rounded-xl border border-[color-mix(in_srgb,var(--color-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--color-fg)_2%,transparent)] px-6 py-5">
        <SectionHeading>Simplify</SectionHeading>

        <div className="flex flex-wrap items-center gap-3">
          <NumInput value={aSimp} onChange={setASimp} placeholder="a" />
          <span className="font-mono text-lg text-muted">:</span>
          <NumInput value={bSimp} onChange={setBSimp} placeholder="b" />

          {simpResult && (
            <>
              <span className="font-mono text-sm text-muted">→</span>
              <span className="font-mono text-2xl font-bold text-fg">
                {simpResult[0]} : {simpResult[1]}
              </span>
            </>
          )}

          {!simpResult && !simpError && (
            <span className="font-mono text-xs text-muted">Enter values to simplify</span>
          )}
        </div>

        {simpError && (
          <p className="mt-2 font-mono text-xs text-red-500">{simpError}</p>
        )}
      </section>

      {/* ── Calculate ───────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-[color-mix(in_srgb,var(--color-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--color-fg)_2%,transparent)] px-6 py-5">
        <SectionHeading>Calculate</SectionHeading>

        {/* Ratio inputs */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="w-16 font-mono text-xs text-muted">Ratio</span>
          <NumInput value={ratioA} onChange={setRatioA} placeholder="16" />
          <span className="font-mono text-lg text-muted">:</span>
          <NumInput value={ratioB} onChange={setRatioB} placeholder="9" />
        </div>

        {/* a row */}
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span className="w-16 font-mono text-xs text-muted">a</span>
          <NumInput value={calcA} onChange={setCalcA} placeholder="1920" />
          {derivedB !== null && (
            <>
              <span className="font-mono text-sm text-muted">→</span>
              <div className="flex flex-col">
                <span className="font-mono text-xs text-muted">b =</span>
                <span className="font-mono text-2xl font-bold text-fg">{formatNum(derivedB)}</span>
                {!Number.isInteger(derivedB) && (
                  <span className="font-mono text-xs text-muted">
                    ↑ {Math.ceil(derivedB)} &nbsp;·&nbsp; ↓ {Math.floor(derivedB)}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* b row */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="w-16 font-mono text-xs text-muted">b</span>
          <NumInput value={calcB} onChange={setCalcB} placeholder="1080" />
          {derivedA !== null && (
            <>
              <span className="font-mono text-sm text-muted">→</span>
              <div className="flex flex-col">
                <span className="font-mono text-xs text-muted">a =</span>
                <span className="font-mono text-2xl font-bold text-fg">{formatNum(derivedA)}</span>
                {!Number.isInteger(derivedA) && (
                  <span className="font-mono text-xs text-muted">
                    ↑ {Math.ceil(derivedA)} &nbsp;·&nbsp; ↓ {Math.floor(derivedA)}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {calcError && (
          <p className="mt-3 font-mono text-xs text-red-500">{calcError}</p>
        )}

        {!calcError && rA === null && rB === null && (
          <p className="mt-3 font-mono text-xs text-muted">
            Enter a ratio, then fill in a or b to calculate the other.
          </p>
        )}
      </section>
    </main>
  );
}
