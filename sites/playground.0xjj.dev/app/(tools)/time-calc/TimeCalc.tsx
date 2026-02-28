'use client';

import { useState } from 'react';

interface Row {
  id: number;
  time: string;
  op: '+' | '-';
}

let nextId = 3;

function parseSeconds(str: string): number | null {
  const match = str.trim().match(/^(\d+):([0-5]\d):([0-5]\d)$/);
  if (!match) return null;
  return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]);
}

function formatSeconds(total: number): string {
  const neg = total < 0;
  const abs = Math.abs(total);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const str = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return neg ? `-${str}` : str;
}

export default function TimeCalc() {
  const [rows, setRows] = useState<Row[]>([
    { id: 1, time: '01:30:00', op: '+' },
    { id: 2, time: '00:45:00', op: '+' },
  ]);

  const addRow = () =>
    setRows((r) => [...r, { id: nextId++, time: '00:00:00', op: '+' }]);

  const removeRow = (id: number) =>
    setRows((r) => r.filter((row) => row.id !== id));

  const updateTime = (id: number, time: string) =>
    setRows((r) => r.map((row) => (row.id === id ? { ...row, time } : row)));

  const updateOp = (id: number, op: '+' | '-') =>
    setRows((r) => r.map((row) => (row.id === id ? { ...row, op } : row)));

  const rowErrors: Map<number, string> = new Map();
  let totalSeconds = 0;
  for (const row of rows) {
    const secs = parseSeconds(row.time);
    if (secs === null) {
      rowErrors.set(row.id, 'Invalid format (use HH:MM:SS)');
    } else {
      totalSeconds += row.op === '+' ? secs : -secs;
    }
  }

  const hasErrors = rowErrors.size > 0;
  const total = hasErrors ? null : formatSeconds(totalSeconds);

  return (
    <div style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-fg)', marginBottom: '0.25rem' }}>
        Time Calculator
      </h1>
      <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Add or subtract HH:MM:SS durations and compute the total.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {rows.map((row, i) => {
          const err = rowErrors.get(row.id);
          return (
            <div key={row.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {/* Op selector (not shown for first row) */}
                {i === 0 ? (
                  <div style={{ width: 40 }} />
                ) : (
                  <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)' }}>
                    {(['+', '-'] as const).map((op) => (
                      <button
                        key={op}
                        onClick={() => updateOp(row.id, op)}
                        style={{
                          width: 32,
                          padding: '0.4rem 0',
                          border: 'none',
                          background: row.op === op ? 'var(--color-accent)' : 'transparent',
                          color: row.op === op ? '#fff' : 'var(--color-muted)',
                          cursor: 'pointer',
                          fontFamily: 'monospace',
                          fontSize: '1rem',
                          fontWeight: 700,
                        }}
                      >
                        {op}
                      </button>
                    ))}
                  </div>
                )}

                <input
                  type="text"
                  value={row.time}
                  onChange={(e) => updateTime(row.id, e.target.value)}
                  placeholder="HH:MM:SS"
                  style={{
                    flex: 1,
                    padding: '0.6rem 0.75rem',
                    borderRadius: 8,
                    border: `1px solid ${err ? '#ef4444' : 'color-mix(in srgb, var(--color-fg) 15%, transparent)'}`,
                    background: 'color-mix(in srgb, var(--color-fg) 5%, transparent)',
                    color: 'var(--color-fg)',
                    fontFamily: 'monospace',
                    fontSize: '1rem',
                    outline: 'none',
                    textAlign: 'center',
                  }}
                />

                {rows.length > 1 && (
                  <button
                    onClick={() => removeRow(row.id)}
                    style={{
                      padding: '0.4rem 0.6rem',
                      borderRadius: 8,
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--color-muted)',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
              {err && (
                <div style={{ marginTop: '0.2rem', marginLeft: 48, fontSize: '0.75rem', color: '#ef4444' }}>
                  {err}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={addRow}
        style={{
          marginTop: '0.75rem',
          padding: '0.5rem 1rem',
          borderRadius: 8,
          border: '1px dashed color-mix(in srgb, var(--color-fg) 25%, transparent)',
          background: 'transparent',
          color: 'var(--color-muted)',
          cursor: 'pointer',
          fontSize: '0.875rem',
        }}
      >
        + Add row
      </button>

      <div
        style={{
          marginTop: '1.5rem',
          padding: '1.25rem 1.5rem',
          borderRadius: 12,
          border: `1px solid ${!hasErrors ? 'var(--color-accent)' : 'color-mix(in srgb, var(--color-fg) 12%, transparent)'}`,
          background: !hasErrors
            ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)'
            : 'color-mix(in srgb, var(--color-fg) 3%, transparent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '0.875rem', color: 'var(--color-muted)' }}>Total</span>
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '1.75rem',
            fontWeight: 700,
            color: hasErrors ? 'var(--color-muted)' : 'var(--color-fg)',
          }}
        >
          {total ?? (hasErrors ? 'Error' : '—')}
        </span>
      </div>
    </div>
  );
}
