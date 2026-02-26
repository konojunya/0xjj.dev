'use client';

import { useEffect, useState } from 'react';

const ALGORITHMS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const;
type Algorithm = (typeof ALGORITHMS)[number];

async function digest(algorithm: Algorithm, text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const buffer = await crypto.subtle.digest(algorithm, data);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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
      className="shrink-0 rounded px-2 py-0.5 font-mono text-xs transition-colors"
      style={{
        background: 'color-mix(in srgb, var(--color-fg) 8%, transparent)',
        color: 'var(--color-muted)',
      }}
    >
      {copied ? 'copied!' : 'copy'}
    </button>
  );
}

export default function HashCalculator() {
  const [input, setInput] = useState('');
  const [hashes, setHashes] = useState<Record<Algorithm, string>>({
    'SHA-1': '',
    'SHA-256': '',
    'SHA-384': '',
    'SHA-512': '',
  });

  useEffect(() => {
    if (!input) {
      setHashes({ 'SHA-1': '', 'SHA-256': '', 'SHA-384': '', 'SHA-512': '' });
      return;
    }
    let cancelled = false;
    Promise.all(ALGORITHMS.map((alg) => digest(alg, input))).then((results) => {
      if (cancelled) return;
      setHashes(Object.fromEntries(ALGORITHMS.map((alg, i) => [alg, results[i]])) as Record<Algorithm, string>);
    });
    return () => { cancelled = true; };
  }, [input]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <a href="/" className="mb-6 inline-block font-mono text-xs text-muted transition-colors hover:text-fg">
          ← back
        </a>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Hash Calculator</h1>
        <p className="mt-1 text-sm text-muted">
          Compute SHA-1, SHA-256, SHA-384, and SHA-512 hashes of any text.
        </p>
      </div>

      {/* Input */}
      <div className="mb-6">
        <label className="mb-1.5 block font-mono text-xs text-muted">Input</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter text to hash..."
          rows={5}
          className="w-full rounded-lg border bg-transparent px-3 py-2 font-mono text-base text-fg outline-none"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-fg) 12%, transparent)',
            resize: 'vertical',
          }}
          spellCheck={false}
        />
      </div>

      {/* Hash results */}
      <div className="space-y-3">
        {ALGORITHMS.map((alg) => (
          <div key={alg}>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-xs text-muted">{alg}</span>
              {hashes[alg] && <CopyButton text={hashes[alg]} />}
            </div>
            <div
              className="overflow-x-auto rounded-lg border px-3 py-2"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-fg) 12%, transparent)',
                background: 'color-mix(in srgb, var(--color-fg) 4%, transparent)',
              }}
            >
              <code className="font-mono text-sm text-fg break-all">
                {hashes[alg] || <span className="text-muted">—</span>}
              </code>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
