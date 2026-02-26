'use client';

import { useState } from 'react';

function generateUuids(count: number, uppercase: boolean): string[] {
  return Array.from({ length: count }, () => {
    const id = crypto.randomUUID();
    return uppercase ? id.toUpperCase() : id;
  });
}

export default function UuidGenerator() {
  const [count, setCount] = useState(5);
  const [uppercase, setUppercase] = useState(false);
  const [uuids, setUuids] = useState<string[]>(() => generateUuids(5, false));
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const generate = () => setUuids(generateUuids(count, uppercase));

  const copyOne = (uuid: string, index: number) => {
    navigator.clipboard.writeText(uuid).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    });
  };

  const copyAll = () => {
    navigator.clipboard.writeText(uuids.join('\n')).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1500);
    });
  };

  const btnBase = 'rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors';

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <a href="/" className="mb-6 inline-block font-mono text-xs text-muted transition-colors hover:text-fg">
          ← back
        </a>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">UUID Generator</h1>
        <p className="mt-1 text-sm text-muted">Generate v4 UUIDs instantly, in bulk.</p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="font-mono text-xs text-muted">Count</label>
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
            className="w-16 rounded-lg border bg-transparent px-2 py-1.5 font-mono text-base text-fg outline-none"
            style={{ borderColor: 'color-mix(in srgb, var(--color-fg) 12%, transparent)' }}
          />
        </div>

        <button
          onClick={() => { setUppercase((u) => !u); setUuids(generateUuids(count, !uppercase)); }}
          className={btnBase}
          style={
            uppercase
              ? { borderColor: 'var(--color-fg)', background: 'var(--color-fg)', color: 'var(--color-bg)' }
              : { borderColor: 'color-mix(in srgb, var(--color-fg) 12%, transparent)', color: 'var(--color-muted)' }
          }
        >
          UPPERCASE
        </button>

        <button
          onClick={generate}
          className={btnBase}
          style={{ background: 'var(--color-fg)', color: 'var(--color-bg)' }}
        >
          Generate
        </button>

        <button
          onClick={copyAll}
          className={btnBase}
          style={{ borderColor: 'color-mix(in srgb, var(--color-fg) 12%, transparent)', color: 'var(--color-muted)' }}
        >
          {copiedAll ? 'copied!' : 'Copy all'}
        </button>
      </div>

      {/* UUID list */}
      <ul className="space-y-2">
        {uuids.map((uuid, i) => (
          <li
            key={i}
            className="flex items-center justify-between rounded-lg border px-3 py-2"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-fg) 12%, transparent)',
              background: 'color-mix(in srgb, var(--color-fg) 3%, transparent)',
            }}
          >
            <code className="font-mono text-sm text-fg select-all">{uuid}</code>
            <button
              onClick={() => copyOne(uuid, i)}
              className="ml-3 shrink-0 rounded px-2 py-0.5 font-mono text-xs transition-colors"
              style={{
                background: 'color-mix(in srgb, var(--color-fg) 8%, transparent)',
                color: 'var(--color-muted)',
              }}
            >
              {copiedIndex === i ? 'copied!' : 'copy'}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
