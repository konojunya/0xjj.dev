'use client';

import { useState } from 'react';

function tokenize(input: string): string[] {
  return input
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[-_\s]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

const FORMATS: { label: string; fn: (words: string[]) => string }[] = [
  {
    label: 'camelCase',
    fn: (ws) => ws.map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1))).join(''),
  },
  {
    label: 'PascalCase',
    fn: (ws) => ws.map((w) => w[0].toUpperCase() + w.slice(1)).join(''),
  },
  {
    label: 'snake_case',
    fn: (ws) => ws.join('_'),
  },
  {
    label: 'kebab-case',
    fn: (ws) => ws.join('-'),
  },
  {
    label: 'UPPER_SNAKE_CASE',
    fn: (ws) => ws.join('_').toUpperCase(),
  },
];

export default function CaseConverter() {
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const words = tokenize(input);
  const hasInput = words.length > 0;

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: 'var(--color-fg)',
          marginBottom: '0.25rem',
        }}
      >
        Case Converter
      </h1>
      <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Convert text between camelCase, PascalCase, snake_case, kebab-case, and UPPER_SNAKE_CASE.
      </p>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter text to convert…"
        rows={3}
        style={{
          width: '100%',
          padding: '0.75rem',
          borderRadius: 8,
          border: '1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)',
          background: 'color-mix(in srgb, var(--color-fg) 5%, transparent)',
          color: 'var(--color-fg)',
          fontSize: '0.95rem',
          fontFamily: 'inherit',
          resize: 'vertical',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {FORMATS.map(({ label, fn }) => {
          const value = hasInput ? fn(words) : '';
          return (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: 8,
                border: '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)',
                background: 'color-mix(in srgb, var(--color-fg) 3%, transparent)',
              }}
            >
              <span
                style={{
                  minWidth: 150,
                  fontSize: '0.8rem',
                  color: 'var(--color-muted)',
                  fontFamily: 'monospace',
                }}
              >
                {label}
              </span>
              <span
                style={{
                  flex: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.95rem',
                  color: value ? 'var(--color-fg)' : 'var(--color-muted)',
                  wordBreak: 'break-all',
                }}
              >
                {value || '—'}
              </span>
              {value && (
                <button
                  onClick={() => copy(value, label)}
                  style={{
                    padding: '0.25rem 0.6rem',
                    borderRadius: 6,
                    border: '1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)',
                    background: copied === label ? 'var(--color-accent)' : 'transparent',
                    color: copied === label ? '#fff' : 'var(--color-muted)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {copied === label ? 'Copied!' : 'Copy'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
