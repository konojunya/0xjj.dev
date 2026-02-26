'use client';

import { useState } from 'react';

type Mode = 'encode' | 'decode';

function encodeBase64(text: string, urlSafe: boolean): string {
  const b64 = btoa(unescape(encodeURIComponent(text)));
  if (!urlSafe) return b64;
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function decodeBase64(b64: string, urlSafe: boolean): string {
  let normalized = b64;
  if (urlSafe) {
    normalized = normalized.replace(/-/g, '+').replace(/_/g, '/');
  }
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return decodeURIComponent(escape(atob(padded)));
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

export default function Base64Tool() {
  const [mode, setMode] = useState<Mode>('encode');
  const [urlSafe, setUrlSafe] = useState(false);
  const [input, setInput] = useState('');

  let output = '';
  let error: string | null = null;

  if (input) {
    try {
      output = mode === 'encode' ? encodeBase64(input, urlSafe) : decodeBase64(input, urlSafe);
    } catch (e) {
      error = (e as Error).message;
    }
  }

  const tabStyle = (active: boolean) =>
    active
      ? { background: 'var(--color-fg)', color: 'var(--color-bg)' }
      : { color: 'var(--color-muted)' };

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <a
          href="/"
          className="mb-6 inline-block font-mono text-xs text-muted transition-colors hover:text-fg"
        >
          ← back
        </a>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          Base64 Encoder / Decoder
        </h1>
        <p className="mt-1 text-sm text-muted">
          Encode text to Base64 or decode Base64 back to text.
        </p>
      </div>

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Mode tabs */}
        <div
          className="flex items-center gap-1 rounded-lg border p-1"
          style={{ borderColor: 'color-mix(in srgb, var(--color-fg) 12%, transparent)' }}
        >
          {(['encode', 'decode'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setInput(''); }}
              className="rounded px-3 py-1 font-mono text-xs capitalize transition-colors"
              style={tabStyle(mode === m)}
            >
              {m}
            </button>
          ))}
        </div>

        {/* URL-safe toggle */}
        <button
          onClick={() => setUrlSafe((s) => !s)}
          className="rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors"
          style={
            urlSafe
              ? { borderColor: 'var(--color-fg)', background: 'var(--color-fg)', color: 'var(--color-bg)' }
              : { borderColor: 'color-mix(in srgb, var(--color-fg) 12%, transparent)', color: 'var(--color-muted)' }
          }
        >
          URL-safe
        </button>
      </div>

      {/* Input */}
      <div className="mb-4">
        <label className="mb-1.5 block font-mono text-xs text-muted">
          {mode === 'encode' ? 'Text' : 'Base64'}
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            mode === 'encode'
              ? 'Enter text to encode...'
              : 'Enter Base64 to decode...'
          }
          rows={6}
          className="w-full rounded-lg border bg-transparent px-3 py-2 font-mono text-base text-fg outline-none transition-colors"
          style={{
            borderColor: error
              ? 'color-mix(in srgb, #ef4444 60%, transparent)'
              : 'color-mix(in srgb, var(--color-fg) 12%, transparent)',
            resize: 'vertical',
          }}
          spellCheck={false}
        />
      </div>

      {/* Arrow indicator */}
      <div className="mb-4 text-center font-mono text-lg text-muted">↓</div>

      {/* Output */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="font-mono text-xs text-muted">
            {mode === 'encode' ? 'Base64' : 'Text'}
          </label>
          {output && <CopyButton text={output} />}
        </div>
        <textarea
          value={output}
          readOnly
          rows={6}
          placeholder="Output will appear here..."
          className="w-full rounded-lg border bg-transparent px-3 py-2 font-mono text-base text-fg outline-none"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-fg) 12%, transparent)',
            background: 'color-mix(in srgb, var(--color-fg) 4%, transparent)',
            resize: 'vertical',
          }}
          spellCheck={false}
        />
      </div>

      {/* Error */}
      {error && (
        <p
          className="mt-3 rounded-lg border px-3 py-2 font-mono text-xs"
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
