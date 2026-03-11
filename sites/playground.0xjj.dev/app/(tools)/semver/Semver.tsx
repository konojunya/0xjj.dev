'use client';

import semver from 'semver';
import { useState } from 'react';

export default function Semver() {
  const [range, setRange] = useState('^1.2.3');
  const [versions, setVersions] = useState('1.2.3\n1.3.0\n2.0.0\n1.2.4\n0.9.9');

  const rangeValid = semver.validRange(range);

  const results = versions
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => {
      const valid = semver.valid(v);
      if (!valid) return { version: v, status: 'invalid' as const };
      if (!rangeValid) return { version: v, status: 'range-invalid' as const };
      const satisfies = semver.satisfies(valid, range);
      return { version: v, status: satisfies ? 'match' : 'no-match' as const };
    });

  return (
    <div style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-fg)', marginBottom: '0.25rem' }}>
        Semver Range Checker
      </h1>
      <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        バージョン番号がsemver範囲を満たすか判定します。
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.4rem' }}>
            範囲
          </label>
          <input
            type="text"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            placeholder="例: ^1.2.3, >=2.0.0 <3.0.0, ~1.5"
            style={{
              width: '100%',
              padding: '0.65rem 0.75rem',
              borderRadius: 8,
              border: `1px solid ${!rangeValid && range ? '#ef4444' : 'color-mix(in srgb, var(--color-fg) 15%, transparent)'}`,
              background: 'color-mix(in srgb, var(--color-fg) 5%, transparent)',
              color: 'var(--color-fg)',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {!rangeValid && range && (
            <div style={{ marginTop: '0.3rem', fontSize: '0.8rem', color: '#ef4444' }}>
              無効なsemver範囲
            </div>
          )}
          {rangeValid && (
            <div style={{ marginTop: '0.3rem', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
              解析結果: <code style={{ fontFamily: 'monospace' }}>{rangeValid}</code>
            </div>
          )}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.4rem' }}>
            バージョン (1行に1つ)
          </label>
          <textarea
            value={versions}
            onChange={(e) => setVersions(e.target.value)}
            rows={6}
            placeholder="1.0.0&#10;2.0.0&#10;1.2.3"
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 8,
              border: '1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)',
              background: 'color-mix(in srgb, var(--color-fg) 5%, transparent)',
              color: 'var(--color-fg)',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>
              結果 ({results.filter((r) => r.status === 'match').length}/{results.length} 一致)
            </div>
            {results.map((r, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.6rem 1rem',
                  borderRadius: 8,
                  border: `1px solid ${r.status === 'match' ? 'color-mix(in srgb, #22c55e 30%, transparent)' : 'color-mix(in srgb, var(--color-fg) 10%, transparent)'}`,
                  background: r.status === 'match'
                    ? 'color-mix(in srgb, #22c55e 8%, transparent)'
                    : 'color-mix(in srgb, var(--color-fg) 2%, transparent)',
                }}
              >
                <span style={{ fontSize: '1rem', lineHeight: 1 }}>
                  {r.status === 'match' ? '✓' : r.status === 'no-match' ? '✗' : '⚠'}
                </span>
                <span
                  style={{
                    flex: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    color: r.status === 'match' ? '#22c55e' : r.status === 'invalid' ? '#f59e0b' : 'var(--color-fg)',
                  }}
                >
                  {r.version}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                  {r.status === 'match' ? '一致' : r.status === 'no-match' ? '不一致' : r.status === 'invalid' ? '無効なバージョン' : '無効な範囲'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
