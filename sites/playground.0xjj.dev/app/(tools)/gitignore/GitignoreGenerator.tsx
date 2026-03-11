'use client';

import { useEffect, useState } from 'react';

export default function GitignoreGenerator() {
  const [templates, setTemplates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [output, setOutput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/gitignore/list')
      .then((r) => r.text())
      .then((text) => {
        const list = text
          .split(/[\n,]/)
          .map((t) => t.trim())
          .filter(Boolean)
          .sort();
        setTemplates(list);
        setLoading(false);
      })
      .catch(() => {
        setError('テンプレート一覧の読み込みに失敗しました。インターネット接続を確認してください。');
        setLoading(false);
      });
  }, []);

  const filtered = templates.filter((t) => t.toLowerCase().includes(search.toLowerCase()));

  const toggle = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name],
    );
  };

  const generate = async () => {
    if (selected.length === 0) return;
    setGenerating(true);
    try {
      const text = await fetch(
        `/api/gitignore/generate?templates=${selected.join(',')}`,
      ).then((r) => r.text());
      setOutput(text);
    } catch {
      setError('.gitignore の生成に失敗しました。もう一度お試しください。');
    } finally {
      setGenerating(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ paddingTop: '2rem', paddingBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-fg)', marginBottom: '0.25rem' }}>
          .gitignore Generator
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
          gitignore.io APIを使って、プロジェクトに合った .gitignore を生成します。
        </p>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: 8, background: 'color-mix(in srgb, red 10%, transparent)', color: 'var(--color-fg)', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1.5rem' }}>
        {/* Template selector */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="テンプレートを検索..."
              style={{
                flex: 1,
                padding: '0.5rem 0.75rem',
                borderRadius: 8,
                border: '1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)',
                background: 'color-mix(in srgb, var(--color-fg) 5%, transparent)',
                color: 'var(--color-fg)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
            {selected.length > 0 && (
              <button
                onClick={() => setSelected([])}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 8,
                  border: '1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)',
                  background: 'transparent',
                  color: 'var(--color-muted)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  whiteSpace: 'nowrap',
                }}
              >
                クリア ({selected.length})
              </button>
            )}
          </div>

          <div
            style={{
              height: 380,
              overflowY: 'auto',
              border: '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)',
              borderRadius: 8,
              padding: '0.5rem',
            }}
          >
            {loading ? (
              <div style={{ padding: '1rem', color: 'var(--color-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
                テンプレートを読み込み中...
              </div>
            ) : (
              filtered.map((name) => (
                <label
                  key={name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.35rem 0.5rem',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    color: selected.includes(name) ? 'var(--color-accent)' : 'var(--color-fg)',
                    background: selected.includes(name)
                      ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
                      : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(name)}
                    onChange={() => toggle(name)}
                    style={{ accentColor: 'var(--color-accent)' }}
                  />
                  {name}
                </label>
              ))
            )}
          </div>

          <button
            onClick={generate}
            disabled={selected.length === 0 || generating}
            style={{
              marginTop: '0.75rem',
              width: '100%',
              padding: '0.65rem',
              borderRadius: 8,
              border: 'none',
              background: selected.length > 0 ? 'var(--color-accent)' : 'color-mix(in srgb, var(--color-fg) 15%, transparent)',
              color: selected.length > 0 ? '#fff' : 'var(--color-muted)',
              cursor: selected.length > 0 ? 'pointer' : 'not-allowed',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            {generating ? '生成中...' : `生成${selected.length > 0 ? ` (${selected.length})` : ''}`}
          </button>
        </div>

        {/* Output */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-muted)' }}>.gitignore</span>
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
                {copied ? 'コピー済み!' : 'コピー'}
              </button>
            )}
          </div>
          <textarea
            readOnly
            value={output}
            placeholder="生成された .gitignore がここに表示されます..."
            style={{
              flex: 1,
              minHeight: 420,
              padding: '0.75rem',
              borderRadius: 8,
              border: '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)',
              background: 'color-mix(in srgb, var(--color-fg) 3%, transparent)',
              color: 'var(--color-fg)',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              resize: 'none',
              outline: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
}
