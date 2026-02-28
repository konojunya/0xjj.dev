'use client';

import { useState } from 'react';

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function jsonToTs(input: string): string {
  const parsed: unknown = JSON.parse(input);
  const interfaces: { name: string; body: string }[] = [];

  function processValue(value: unknown, typeName: string): string {
    if (value === null) return 'null';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return Number.isInteger(value) ? 'number' : 'number';
    if (typeof value === 'string') return 'string';

    if (Array.isArray(value)) {
      if (value.length === 0) return 'unknown[]';
      const itemTypeName = typeName.endsWith('s') ? typeName.slice(0, -1) : typeName + 'Item';
      const types = new Set(value.map((item) => processValue(item, capitalize(itemTypeName))));
      const typeStr = types.size === 1 ? [...types][0] : `(${[...types].join(' | ')})`;
      return `${typeStr}[]`;
    }

    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const props = Object.entries(obj).map(([k, v]) => {
        const childTypeName = typeName + capitalize(k);
        const propType = processValue(v, childTypeName);
        const isOptional = v === null || v === undefined;
        const propName = /^[a-zA-Z_$][\w$]*$/.test(k) ? k : `"${k}"`;
        return `  ${propName}${isOptional ? '?' : ''}: ${propType};`;
      });
      interfaces.push({ name: typeName, body: props.join('\n') });
      return typeName;
    }

    return 'unknown';
  }

  processValue(parsed, 'Root');

  return interfaces
    .reverse()
    .map(({ name, body }) => `interface ${name} {\n${body}\n}`)
    .join('\n\n');
}

const EXAMPLE = JSON.stringify(
  {
    id: 1,
    name: 'Alice',
    email: 'alice@example.com',
    address: {
      street: '123 Main St',
      city: 'Springfield',
      zip: '62701',
    },
    tags: ['admin', 'user'],
    active: true,
    score: null,
  },
  null,
  2,
);

export default function JsonToTs() {
  const [input, setInput] = useState(EXAMPLE);
  const [copied, setCopied] = useState(false);

  let output = '';
  let error = '';
  try {
    output = input.trim() ? jsonToTs(input) : '';
  } catch (e) {
    error = e instanceof Error ? e.message : 'Invalid JSON';
  }

  const copy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-fg)', marginBottom: '0.25rem' }}>
        JSON to TypeScript
      </h1>
      <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Paste JSON to generate TypeScript interfaces. Handles nested objects and arrays.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.4rem' }}>
            JSON input
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='{"key": "value"}'
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
            <label style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>TypeScript output</label>
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
            placeholder="TypeScript interfaces will appear here…"
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
