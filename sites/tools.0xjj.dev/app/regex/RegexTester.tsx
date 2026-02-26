'use client';

import { useMemo, useState } from 'react';

type Flag = 'g' | 'i' | 'm' | 's' | 'u';
const ALL_FLAGS: Flag[] = ['g', 'i', 'm', 's', 'u'];

interface Match {
  index: number;
  value: string;
  groups: (string | undefined)[];
}

interface Segment {
  text: string;
  highlighted: boolean;
}

export default function RegexTester() {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState<Set<Flag>>(new Set(['g']));
  const [testStr, setTestStr] = useState('');

  const toggleFlag = (f: Flag) => {
    setFlags((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  };

  const { matches, segments, error } = useMemo<{
    matches: Match[];
    segments: Segment[];
    error: string | null;
  }>(() => {
    if (!pattern) return { matches: [], segments: [{ text: testStr, highlighted: false }], error: null };
    let regex: RegExp;
    try {
      const flagStr = Array.from(flags).join('');
      const withG = flagStr.includes('g') ? flagStr : flagStr + 'g';
      regex = new RegExp(pattern, withG);
    } catch (e) {
      return { matches: [], segments: [], error: (e as Error).message };
    }

    const matches: Match[] = [];
    for (const m of testStr.matchAll(regex)) {
      matches.push({
        index: m.index ?? 0,
        value: m[0],
        groups: m.slice(1),
      });
    }

    // Build segments for highlighting
    const segments: Segment[] = [];
    let cursor = 0;
    for (const m of matches) {
      if (m.index > cursor) {
        segments.push({ text: testStr.slice(cursor, m.index), highlighted: false });
      }
      segments.push({ text: m.value, highlighted: true });
      cursor = m.index + m.value.length;
    }
    if (cursor < testStr.length) {
      segments.push({ text: testStr.slice(cursor), highlighted: false });
    }
    if (segments.length === 0 && testStr) {
      segments.push({ text: testStr, highlighted: false });
    }

    return { matches, segments, error: null };
  }, [pattern, flags, testStr]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <a
          href="/"
          className="mb-6 inline-block font-mono text-xs text-muted transition-colors hover:text-fg"
        >
          ← back
        </a>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">RegEx Tester</h1>
        <p className="mt-1 text-sm text-muted">
          Test regular expressions with live match highlighting.
        </p>
      </div>

      {/* Pattern input + flags */}
      <div className="mb-4">
        <label className="mb-1.5 block font-mono text-xs text-muted">Pattern</label>
        <div className="flex items-center gap-2">
          <div
            className="flex flex-1 items-center rounded-lg border px-3 py-2"
            style={{
              borderColor: error
                ? 'color-mix(in srgb, #ef4444 60%, transparent)'
                : 'color-mix(in srgb, var(--color-fg) 12%, transparent)',
            }}
          >
            <span className="font-mono text-sm text-muted select-none">/</span>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="pattern"
              className="flex-1 bg-transparent px-1 font-mono text-base text-fg outline-none"
              spellCheck={false}
            />
            <span className="font-mono text-sm text-muted select-none">/</span>
          </div>
          {/* Flags */}
          <div className="flex gap-1">
            {ALL_FLAGS.map((f) => (
              <button
                key={f}
                onClick={() => toggleFlag(f)}
                className="rounded px-2 py-1.5 font-mono text-xs font-semibold transition-colors"
                style={
                  flags.has(f)
                    ? { background: 'var(--color-accent)', color: '#fff' }
                    : {
                        background: 'color-mix(in srgb, var(--color-fg) 8%, transparent)',
                        color: 'var(--color-muted)',
                      }
                }
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        {error && (
          <p className="mt-2 font-mono text-xs" style={{ color: '#ef4444' }}>
            {error}
          </p>
        )}
      </div>

      {/* Test string */}
      <div className="mb-6">
        <label className="mb-1.5 block font-mono text-xs text-muted">Test string</label>
        <textarea
          value={testStr}
          onChange={(e) => setTestStr(e.target.value)}
          placeholder="Enter test string..."
          rows={6}
          className="w-full rounded-lg border bg-transparent px-3 py-2 font-mono text-base text-fg outline-none"
          style={{ borderColor: 'color-mix(in srgb, var(--color-fg) 12%, transparent)', resize: 'vertical' }}
          spellCheck={false}
        />
      </div>

      {/* Result */}
      {testStr && (
        <div>
          <div
            className="mb-3 border-b pb-2"
            style={{ borderColor: 'color-mix(in srgb, var(--color-fg) 12%, transparent)' }}
          >
            <span className="font-mono text-xs font-semibold text-fg">Result</span>
            <span className="ml-3 font-mono text-xs text-muted">
              {matches.length} match{matches.length !== 1 ? 'es' : ''}
            </span>
          </div>

          {/* Highlighted test string */}
          {segments.length > 0 && (
            <div
              className="mb-4 rounded-lg border px-3 py-2 font-mono text-sm leading-relaxed"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-fg) 12%, transparent)',
                background: 'color-mix(in srgb, var(--color-fg) 4%, transparent)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {segments.map((seg, i) =>
                seg.highlighted ? (
                  <mark
                    key={i}
                    className="rounded px-0.5"
                    style={{ background: 'color-mix(in srgb, var(--color-accent) 30%, transparent)', color: 'inherit' }}
                  >
                    {seg.text}
                  </mark>
                ) : (
                  <span key={i} className="text-fg">{seg.text}</span>
                ),
              )}
            </div>
          )}

          {/* Match list */}
          {matches.length > 0 && (
            <div className="space-y-2">
              {matches.map((m, i) => (
                <div
                  key={i}
                  className="rounded-lg border px-3 py-2"
                  style={{ borderColor: 'color-mix(in srgb, var(--color-fg) 12%, transparent)' }}
                >
                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-muted">Match {i + 1}</span>
                    <span className="text-muted">index: {m.index}</span>
                    <span
                      className="rounded px-1 py-0.5"
                      style={{ background: 'color-mix(in srgb, var(--color-accent) 20%, transparent)', color: 'var(--color-fg)' }}
                    >
                      &ldquo;{m.value}&rdquo;
                    </span>
                  </div>
                  {m.groups.length > 0 && m.groups.some((g) => g !== undefined) && (
                    <div className="mt-1 font-mono text-xs text-muted">
                      Groups: {m.groups.map((g, gi) => (
                        <span key={gi} className="mr-2">
                          [{gi + 1}]: {g === undefined ? 'undefined' : `"${g}"`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
