'use client';

import { useMemo, useState } from 'react';

type Indent = 2 | 4 | '\t';

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

export default function JsonFormatter() {
  const [input, setInput] = useState('');
  const [indent, setIndent] = useState<Indent>(2);
  const [minify, setMinify] = useState(false);

  const { output, error } = useMemo(() => {
    if (!input.trim()) return { output: '', error: null };
    try {
      const parsed = JSON.parse(input);
      const out = minify
        ? JSON.stringify(parsed)
        : JSON.stringify(parsed, null, indent);
      return { output: out, error: null };
    } catch (e) {
      return { output: '', error: (e as SyntaxError).message };
    }
  }, [input, indent, minify]);

  const indentOptions: { label: string; value: Indent }[] = [
    { label: '2 spaces', value: 2 },
    { label: '4 spaces', value: 4 },
    { label: 'Tab', value: '\t' },
  ];

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <a
          href="/"
          className="mb-6 inline-block font-mono text-xs text-muted transition-colors hover:text-fg"
        >
          ← back
        </a>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">JSON Formatter</h1>
        <p className="mt-1 text-sm text-muted">
          Format and validate JSON with syntax error reporting.
        </p>
      </div>

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border p-1" style={{ borderColor: 'color-mix(in srgb, var(--color-fg) 12%, transparent)' }}>
          {indentOptions.map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => { setIndent(opt.value); setMinify(false); }}
              className="rounded px-3 py-1 font-mono text-xs transition-colors"
              style={
                indent === opt.value && !minify
                  ? { background: 'var(--color-fg)', color: 'var(--color-bg)' }
                  : { color: 'var(--color-muted)' }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setMinify((m) => !m)}
          className="rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors"
          style={
            minify
              ? { borderColor: 'var(--color-fg)', background: 'var(--color-fg)', color: 'var(--color-bg)' }
              : { borderColor: 'color-mix(in srgb, var(--color-fg) 12%, transparent)', color: 'var(--color-muted)' }
          }
        >
          Minify
        </button>
      </div>

      {/* Input */}
      <div className="mb-4">
        <label className="mb-1.5 block font-mono text-xs text-muted">Input</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Paste JSON here...'
          rows={10}
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

      {/* Error */}
      {error && (
        <p className="mb-4 rounded-lg border px-3 py-2 font-mono text-xs" style={{ borderColor: 'color-mix(in srgb, #ef4444 40%, transparent)', color: '#ef4444', background: 'color-mix(in srgb, #ef4444 8%, transparent)' }}>
          {error}
        </p>
      )}

      {/* Output */}
      {output && (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="font-mono text-xs text-muted">Output</span>
            <CopyButton text={output} />
          </div>
          <pre
            className="w-full overflow-auto rounded-lg border px-3 py-2 font-mono text-sm text-fg"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-fg) 12%, transparent)',
              background: 'color-mix(in srgb, var(--color-fg) 4%, transparent)',
              maxHeight: '400px',
            }}
          >
            <code>{output}</code>
          </pre>
        </div>
      )}
    </main>
  );
}
