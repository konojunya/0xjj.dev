'use client';

import { useState, useTransition } from 'react';
import type { MetaEntry, MetaResult } from '../api/meta/route';

// ─── grouping ────────────────────────────────────────────────────────────────

const GROUPS: Array<{
  id: string;
  label: string;
  match: (key: string) => boolean;
}> = [
  {
    id: 'og',
    label: 'Open Graph',
    match: (k) => /^(og|article|book|profile|music|video):/.test(k),
  },
  {
    id: 'twitter',
    label: 'Twitter / X Card',
    match: (k) => k.startsWith('twitter:'),
  },
  {
    id: 'standard',
    label: 'Standard',
    match: (k) =>
      [
        'title',
        'description',
        'keywords',
        'author',
        'robots',
        'googlebot',
        'viewport',
        'theme-color',
        'generator',
        'referrer',
        'rating',
        'copyright',
        'language',
        'revisit-after',
        'application-name',
        'msapplication-TileColor',
        'msapplication-TileImage',
      ].includes(k),
  },
  {
    id: 'link',
    label: 'Link Tags',
    match: (k) => k.startsWith('link:'),
  },
  {
    id: 'other',
    label: 'Other',
    match: () => true,
  },
];

function categorize(entry: MetaEntry): string {
  for (const g of GROUPS) {
    if (g.match(entry.key)) return g.id;
  }
  return 'other';
}

// ─── image detection ──────────────────────────────────────────────────────────

function shouldShowImage(key: string, content: string): boolean {
  const keyHasImage = /image/i.test(key);
  const looksLikeUrl = /^https?:\/\//i.test(content);
  return keyHasImage && looksLikeUrl;
}

// ─── sub components ───────────────────────────────────────────────────────────

function PreviewCard({ entries, title }: { entries: MetaEntry[]; title: string }) {
  const get = (key: string) => entries.find((e) => e.key === key)?.content ?? '';

  const ogImage = get('og:image') || get('twitter:image');
  const ogTitle = get('og:title') || title;
  const ogDesc = get('og:description') || get('description');
  const ogSiteName = get('og:site_name');
  const twitterCard = get('twitter:card');

  const isLarge = twitterCard === 'summary_large_image' || !!ogImage;

  return (
    <div className="mb-8">
      <h2 className="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-neutral-400">
        Preview
      </h2>
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm max-w-lg">
        {ogImage && isLarge && (
          <div className="aspect-[1.91/1] w-full overflow-hidden bg-neutral-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ogImage}
              alt="OGP image"
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
        <div className="p-4">
          {ogImage && !isLarge && (
            <div className="float-right ml-4 h-16 w-16 overflow-hidden rounded-lg bg-neutral-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ogImage}
                alt="OGP image"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
          {ogSiteName && (
            <p className="mb-1 font-mono text-xs text-neutral-400">{ogSiteName}</p>
          )}
          <p className="font-semibold leading-snug text-neutral-900 line-clamp-2">
            {ogTitle || '(no title)'}
          </p>
          {ogDesc && (
            <p className="mt-1 text-sm text-neutral-500 line-clamp-2">{ogDesc}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaTable({ entries }: { entries: MetaEntry[] }) {
  if (entries.length === 0) return null;

  const grouped = new Map<string, MetaEntry[]>();
  for (const g of GROUPS) grouped.set(g.id, []);
  for (const e of entries) {
    const gid = categorize(e);
    grouped.get(gid)!.push(e);
  }

  return (
    <div className="space-y-6">
      {GROUPS.map(({ id, label }) => {
        const items = grouped.get(id)!;
        if (items.length === 0) return null;
        return (
          <div key={id}>
            <h2 className="mb-2 font-mono text-xs font-medium uppercase tracking-widest text-neutral-400">
              {label}{' '}
              <span className="text-neutral-300">({items.length})</span>
            </h2>
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50">
                    <th className="w-56 px-4 py-2.5 text-left font-mono text-xs font-medium text-neutral-400">
                      property
                    </th>
                    <th className="px-4 py-2.5 text-left font-mono text-xs font-medium text-neutral-400">
                      content
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((entry, i) => (
                    <tr
                      key={i}
                      className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50 transition-colors"
                    >
                      <td className="w-56 px-4 py-3 align-top">
                        <span className="font-mono text-xs text-neutral-600 break-all">
                          {entry.key}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className="text-xs text-neutral-800 break-all">
                          {entry.content}
                        </span>
                        {shouldShowImage(entry.key, entry.content) && (
                          <div className="mt-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={entry.content}
                              alt={entry.key}
                              className="max-w-xs rounded-lg border border-neutral-200 object-contain"
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function OgpChecker() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<MetaResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function check(url: string) {
    if (!url.trim()) return;
    setError(null);
    setResult(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/meta?url=${encodeURIComponent(url.trim())}`);
        const json = await res.json();
        if (!res.ok || json.error) {
          setError(json.error ?? 'Something went wrong');
        } else {
          setResult(json as MetaResult);
        }
      } catch {
        setError('Network error — could not reach the server');
      }
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    check(input);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      {/* Page heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">OGP Checker</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Inspect Open Graph, Twitter Card, and all meta tags for any URL.
        </p>
      </div>

      {/* URL input */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-2">
          <input
            type="url"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="https://example.com"
            required
            className="flex-1 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 font-mono text-sm text-neutral-900 shadow-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-900/8 transition-colors"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-neutral-900 px-5 py-2.5 font-mono text-sm font-medium text-white shadow-sm transition-colors hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Checking…' : 'Check'}
          </button>
        </div>
      </form>

      {/* Loading */}
      {isPending && (
        <div className="flex items-center gap-3 text-sm text-neutral-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
          Fetching and parsing meta tags…
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      {result && !isPending && (
        <div>
          {/* URL info */}
          {result.finalUrl !== result.url && (
            <p className="mb-6 font-mono text-xs text-neutral-400">
              Redirected to{' '}
              <a
                href={result.finalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-600 underline underline-offset-2 hover:text-neutral-900"
              >
                {result.finalUrl}
              </a>
            </p>
          )}

          {/* OGP Preview card */}
          <PreviewCard entries={result.entries} title={result.title} />

          {/* Detailed table */}
          <MetaTable entries={result.entries} />

          {result.entries.length === 0 && (
            <p className="text-sm text-neutral-500">No meta tags found.</p>
          )}
        </div>
      )}
    </main>
  );
}
