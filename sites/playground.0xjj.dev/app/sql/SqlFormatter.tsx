'use client';

import { format } from 'sql-formatter';
import { useState } from 'react';

type Dialect = 'sql' | 'mysql' | 'postgresql' | 'sqlite' | 'bigquery' | 'tsql';

const DIALECTS: { value: Dialect; label: string }[] = [
  { value: 'sql', label: 'Standard SQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'sqlite', label: 'SQLite' },
  { value: 'bigquery', label: 'BigQuery' },
  { value: 'tsql', label: 'T-SQL' },
];

const INDENT_OPTIONS = [2, 4] as const;

const EXAMPLE = `select u.id, u.name, u.email, count(o.id) as order_count, sum(o.total) as total_spent from users u left join orders o on o.user_id = u.id where u.created_at > '2024-01-01' and u.active = true group by u.id, u.name, u.email having count(o.id) > 0 order by total_spent desc limit 20;`;

export default function SqlFormatter() {
  const [input, setInput] = useState(EXAMPLE);
  const [dialect, setDialect] = useState<Dialect>('sql');
  const [indent, setIndent] = useState<2 | 4>(2);
  const [copied, setCopied] = useState(false);

  let output = '';
  let error = '';
  try {
    output = input.trim() ? format(input, { language: dialect, tabWidth: indent, keywordCase: 'upper' }) : '';
  } catch (e) {
    error = e instanceof Error ? e.message : 'Invalid SQL';
  }

  const copy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-fg)', marginBottom: '0.25rem' }}>
        SQL Formatter
      </h1>
      <p style={{ color: 'var(--color-muted)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
        Format and prettify SQL queries with dialect support.
      </p>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {DIALECTS.map((d) => (
            <button
              key={d.value}
              onClick={() => setDialect(d.value)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 8,
                border: '1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)',
                background: dialect === d.value ? 'var(--color-accent)' : 'transparent',
                color: dialect === d.value ? '#fff' : 'var(--color-muted)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: dialect === d.value ? 600 : 400,
                whiteSpace: 'nowrap',
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', marginLeft: 'auto', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Indent:</span>
          {INDENT_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => setIndent(n)}
              style={{
                padding: '0.35rem 0.6rem',
                borderRadius: 8,
                border: '1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)',
                background: indent === n ? 'var(--color-accent)' : 'transparent',
                color: indent === n ? '#fff' : 'var(--color-muted)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.4rem' }}>
            SQL input
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter SQL query…"
            style={{
              width: '100%',
              height: 420,
              padding: '0.75rem',
              borderRadius: 8,
              border: `1px solid ${error ? '#ef4444' : 'color-mix(in srgb, var(--color-fg) 15%, transparent)'}`,
              background: 'color-mix(in srgb, var(--color-fg) 5%, transparent)',
              color: 'var(--color-fg)',
              fontFamily: 'monospace',
              fontSize: '0.825rem',
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {error && (
            <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: '#ef4444' }}>{error}</div>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Formatted SQL</label>
            {output && (
              <button
                onClick={copy}
                style={{
                  padding: '0.25rem 0.6rem',
                  borderRadius: 6,
                  border: '1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)',
                  background: copied ? 'var(--color-accent)' : 'transparent',
                  color: copied ? '#fff' : 'var(--color-muted)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            )}
          </div>
          <textarea
            readOnly
            value={output}
            placeholder="Formatted SQL will appear here…"
            style={{
              width: '100%',
              height: 420,
              padding: '0.75rem',
              borderRadius: 8,
              border: '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)',
              background: 'color-mix(in srgb, var(--color-fg) 3%, transparent)',
              color: 'var(--color-fg)',
              fontFamily: 'monospace',
              fontSize: '0.825rem',
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>
    </div>
  );
}
