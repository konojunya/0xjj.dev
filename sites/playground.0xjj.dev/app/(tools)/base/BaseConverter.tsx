'use client';

import { useState } from 'react';

type Base = 2 | 8 | 10 | 16;

const BASES: { base: Base; label: string; prefix: string; placeholder: string }[] = [
  { base: 2,  label: 'Binary',      prefix: '0b', placeholder: '1010' },
  { base: 8,  label: 'Octal',       prefix: '0o', placeholder: '12' },
  { base: 10, label: 'Decimal',     prefix: '',   placeholder: '10' },
  { base: 16, label: 'Hexadecimal', prefix: '0x', placeholder: 'a' },
];

function toBase(value: bigint, base: Base): string {
  if (base === 10) return value.toString(10);
  if (base === 16) return value.toString(16).toUpperCase();
  return value.toString(base);
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
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

export default function BaseConverter() {
  const [raw, setRaw] = useState('');
  const [activeBase, setActiveBase] = useState<Base>(10);

  let parsed: bigint | null = null;
  let error: string | null = null;

  if (raw.trim()) {
    try {
      parsed = BigInt(activeBase === 16 ? '0x' + raw : activeBase === 8 ? '0o' + raw : activeBase === 2 ? '0b' + raw : raw);
    } catch {
      error = `Invalid ${BASES.find(b => b.base === activeBase)?.label.toLowerCase()} number`;
    }
  }

  const handleChange = (base: Base, value: string) => {
    setActiveBase(base);
    setRaw(value);
  };

  const inputStyle = (base: Base) => ({
    borderColor: error && base === activeBase
      ? 'color-mix(in srgb, #ef4444 60%, transparent)'
      : 'color-mix(in srgb, var(--color-fg) 12%, transparent)',
  });

  return (
    <main className=" py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Number Base Converter</h1>
        <p className="mt-1 text-sm text-muted">
          Convert numbers between binary, octal, decimal, and hexadecimal.
        </p>
      </div>

      <div className="space-y-4">
        {BASES.map(({ base, label, prefix, placeholder }) => {
          const value = base === activeBase ? raw : parsed !== null ? toBase(parsed, base) : '';
          return (
            <div key={base}>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="font-mono text-xs text-muted">
                  {label}
                  {prefix && <span className="ml-1 opacity-50">{prefix}</span>}
                </label>
                {value && parsed !== null && <CopyButton text={value} />}
              </div>
              <input
                type="text"
                value={value}
                onChange={(e) => handleChange(base, e.target.value.trim())}
                onFocus={() => { if (parsed !== null) { setActiveBase(base); setRaw(toBase(parsed, base)); } else { setActiveBase(base); } }}
                placeholder={placeholder}
                className="w-full rounded-lg border bg-transparent px-3 py-2.5 font-mono text-base text-fg outline-none transition-colors"
                style={inputStyle(base)}
                spellCheck={false}
              />
            </div>
          );
        })}
      </div>

      {error && (
        <p
          className="mt-4 rounded-lg border px-3 py-2 font-mono text-xs"
          style={{
            borderColor: 'color-mix(in srgb, #ef4444 40%, transparent)',
            color: '#ef4444',
            background: 'color-mix(in srgb, #ef4444 8%, transparent)',
          }}
        >
          {error}
        </p>
      )}
    </main>
  );
}
