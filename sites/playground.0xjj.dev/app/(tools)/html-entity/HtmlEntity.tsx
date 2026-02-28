'use client';

import { useState } from 'react';

const ENTITIES: [string, string][] = [
  ['&', '&amp;'],
  ['<', '&lt;'],
  ['>', '&gt;'],
  ['"', '&quot;'],
  ["'", '&#39;'],
  ['`', '&#96;'],
  ['©', '&copy;'],
  ['®', '&reg;'],
  ['™', '&trade;'],
  ['°', '&deg;'],
  ['±', '&plusmn;'],
  ['×', '&times;'],
  ['÷', '&divide;'],
  ['€', '&euro;'],
  ['£', '&pound;'],
  ['¥', '&yen;'],
  ['¢', '&cent;'],
  ['§', '&sect;'],
  ['¶', '&para;'],
  ['•', '&bull;'],
  ['…', '&hellip;'],
  ['–', '&ndash;'],
  ['—', '&mdash;'],
  ['\u00A0', '&nbsp;'],
];

function encode(text: string): string {
  let result = text;
  for (const [char, entity] of ENTITIES) {
    result = result.split(char).join(entity);
  }
  // Encode remaining non-ASCII as numeric entities
  return result.replace(/[^\x00-\x7E]/g, (c) => `&#${c.codePointAt(0)};`);
}

function decode(text: string): string {
  // Use named entities map
  const entityMap = new Map(ENTITIES.map(([char, entity]) => [entity, char]));

  return text
    .replace(/&[a-zA-Z]+;/g, (match) => entityMap.get(match) ?? match)
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
}

type Mode = 'encode' | 'decode';

export default function HtmlEntity() {
  const [mode, setMode] = useState<Mode>('encode');
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  const output = input ? (mode === 'encode' ? encode(input) : decode(input)) : '';

  const copy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const swapToOpposite = () => {
    const nextMode: Mode = mode === 'encode' ? 'decode' : 'encode';
    setMode(nextMode);
    setInput(output);
  };

  return (
    <div style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-fg)', marginBottom: '0.25rem' }}>
        HTML Entity Encoder / Decoder
      </h1>
      <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Encode special characters to HTML entities or decode entities back to text.
      </p>

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {(['encode', 'decode'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: 8,
              border: '1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)',
              background: mode === m ? 'var(--color-accent)' : 'transparent',
              color: mode === m ? '#fff' : 'var(--color-muted)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: mode === m ? 600 : 400,
              textTransform: 'capitalize',
            }}
          >
            {m}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.4rem' }}>
            {mode === 'encode' ? 'Plain text' : 'HTML entities'}
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'encode' ? 'Enter text with special characters…' : 'Enter HTML entities (e.g. &lt;div&gt;)…'}
            rows={5}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 8,
              border: '1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)',
              background: 'color-mix(in srgb, var(--color-fg) 5%, transparent)',
              color: 'var(--color-fg)',
              fontFamily: mode === 'decode' ? 'monospace' : 'inherit',
              fontSize: '0.9rem',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={swapToOpposite}
            disabled={!output}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: 8,
              border: '1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)',
              background: 'transparent',
              color: output ? 'var(--color-fg)' : 'var(--color-muted)',
              cursor: output ? 'pointer' : 'not-allowed',
              fontSize: '0.875rem',
            }}
          >
            ⇅ Swap
          </button>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
              {mode === 'encode' ? 'HTML entities' : 'Plain text'}
            </label>
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
            placeholder="Output will appear here…"
            rows={5}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 8,
              border: '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)',
              background: 'color-mix(in srgb, var(--color-fg) 3%, transparent)',
              color: 'var(--color-fg)',
              fontFamily: mode === 'encode' ? 'monospace' : 'inherit',
              fontSize: '0.9rem',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>
    </div>
  );
}
