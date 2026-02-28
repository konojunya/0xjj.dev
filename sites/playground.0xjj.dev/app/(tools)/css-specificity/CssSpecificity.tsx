'use client';

import { useState } from 'react';

interface Specificity {
  a: number;
  b: number;
  c: number;
}

function calcSpecificity(selector: string): Specificity {
  let a = 0,
    b = 0,
    c = 0;

  // Remove string contents
  let s = selector.replace(/"[^"]*"|'[^']*'/g, '');

  // Pseudo-elements (::before, ::after, ::first-line, etc.) → c
  s = s.replace(/::[a-zA-Z-]+/g, () => {
    c++;
    return '';
  });

  // :not() — add inner selector specificity (recursively)
  s = s.replace(/:not\(([^)]+)\)/g, (_, inner: string) => {
    const inner_ = calcSpecificity(inner);
    a += inner_.a;
    b += inner_.b;
    c += inner_.c;
    return '';
  });

  // Pseudo-classes (:hover, :focus, etc.) → b
  s = s.replace(/:[a-zA-Z-]+(?:\([^)]*\))?/g, () => {
    b++;
    return '';
  });

  // Attribute selectors ([attr]) → b
  s = s.replace(/\[[^\]]*\]/g, () => {
    b++;
    return '';
  });

  // ID selectors (#id) → a
  s = s.replace(/#[a-zA-Z_][\w-]*/g, () => {
    a++;
    return '';
  });

  // Class selectors (.class) → b
  s = s.replace(/\.[a-zA-Z_][\w-]*/g, () => {
    b++;
    return '';
  });

  // Remove combinators
  s = s.replace(/[+>~]/g, ' ').replace(/\*/g, ' ');

  // Element type selectors (remaining words) → c
  const elements = s
    .split(/\s+/)
    .filter((e) => e.trim() && /^[a-zA-Z][a-zA-Z0-9-]*$/.test(e.trim()));
  c += elements.length;

  return { a, b, c };
}

function compareSpecificity(a: Specificity, b: Specificity): number {
  if (a.a !== b.a) return a.a - b.a;
  if (a.b !== b.b) return a.b - b.b;
  return a.c - b.c;
}

interface Row {
  id: number;
  selector: string;
}

let nextId = 1;

export default function CssSpecificity() {
  const [rows, setRows] = useState<Row[]>([
    { id: nextId++, selector: '#header .nav > a:hover' },
    { id: nextId++, selector: '.nav a' },
  ]);

  const addRow = () => setRows((r) => [...r, { id: nextId++, selector: '' }]);
  const removeRow = (id: number) => setRows((r) => r.filter((row) => row.id !== id));
  const updateRow = (id: number, selector: string) =>
    setRows((r) => r.map((row) => (row.id === id ? { ...row, selector } : row)));

  const results = rows.map((row) => ({
    ...row,
    spec: row.selector.trim() ? calcSpecificity(row.selector) : null,
  }));

  const maxSpec = results.reduce<Specificity | null>((max, r) => {
    if (!r.spec) return max;
    if (!max) return r.spec;
    return compareSpecificity(r.spec, max) > 0 ? r.spec : max;
  }, null);

  const isWinner = (spec: Specificity | null) => {
    if (!spec || !maxSpec) return false;
    return spec.a === maxSpec.a && spec.b === maxSpec.b && spec.c === maxSpec.c;
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-fg)', marginBottom: '0.25rem' }}>
        CSS Specificity Calculator
      </h1>
      <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Enter CSS selectors to calculate their specificity (a, b, c).
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {rows.map((row) => {
          const result = results.find((r) => r.id === row.id);
          const spec = result?.spec ?? null;
          const winner = isWinner(spec) && results.filter((r) => r.spec).length > 1;

          return (
            <div
              key={row.id}
              style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                borderRadius: 8,
                border: `1px solid ${winner ? 'var(--color-accent)' : 'color-mix(in srgb, var(--color-fg) 12%, transparent)'}`,
                background: winner
                  ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)'
                  : 'color-mix(in srgb, var(--color-fg) 3%, transparent)',
              }}
            >
              <input
                type="text"
                value={row.selector}
                onChange={(e) => updateRow(row.id, e.target.value)}
                placeholder="CSS selector (e.g. #id .class > a)"
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  borderRadius: 6,
                  border: '1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)',
                  background: 'color-mix(in srgb, var(--color-fg) 5%, transparent)',
                  color: 'var(--color-fg)',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
              {spec && (
                <div
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    whiteSpace: 'nowrap',
                    color: winner ? 'var(--color-accent)' : 'var(--color-fg)',
                  }}
                >
                  <span title="ID selectors" style={{ padding: '0.25rem 0.5rem', borderRadius: 4, background: 'color-mix(in srgb, var(--color-fg) 8%, transparent)' }}>
                    {spec.a}
                  </span>
                  <span title="Class/attr/pseudo-class" style={{ padding: '0.25rem 0.5rem', borderRadius: 4, background: 'color-mix(in srgb, var(--color-fg) 8%, transparent)' }}>
                    {spec.b}
                  </span>
                  <span title="Element/pseudo-element" style={{ padding: '0.25rem 0.5rem', borderRadius: 4, background: 'color-mix(in srgb, var(--color-fg) 8%, transparent)' }}>
                    {spec.c}
                  </span>
                  {winner && <span style={{ color: 'var(--color-accent)' }}>★</span>}
                </div>
              )}
              {rows.length > 1 && (
                <button
                  onClick={() => removeRow(row.id)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: 6,
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--color-muted)',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    lineHeight: 1,
                  }}
                  title="Remove"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button
          onClick={addRow}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: 8,
            border: '1px dashed color-mix(in srgb, var(--color-fg) 25%, transparent)',
            background: 'transparent',
            color: 'var(--color-muted)',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          + Add selector
        </button>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
          Columns: a (ID) · b (class/attr/pseudo-class) · c (element/pseudo-element)
        </span>
      </div>
    </div>
  );
}
