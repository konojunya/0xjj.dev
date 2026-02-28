'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useQueryState } from 'nuqs';
import type { InspectResult, DnsRecord } from '../../api/inspect/route';

type Result = InspectResult & { httpError?: string };

// ─── sub components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: number }) {
  const color =
    status >= 200 && status < 300
      ? 'text-green-600 bg-green-500/10 border-green-400/30'
      : status >= 300 && status < 400
        ? 'text-yellow-600 bg-yellow-500/10 border-yellow-400/30'
        : 'text-red-500 bg-red-500/10 border-red-400/30';

  return (
    <span className={`inline-block rounded-md border px-2 py-0.5 font-mono text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}

function RequestInfo({ result }: { result: Result }) {
  return (
    <Section label="Request">
      <div className="space-y-2 px-4 py-3 text-sm">
        <div className="flex items-start gap-3">
          <span className="w-28 shrink-0 font-mono text-xs text-muted">URL</span>
          <span className="break-all font-mono text-xs text-fg">{result.url}</span>
        </div>
        {result.resolvedUrl !== result.url && (
          <div className="flex items-start gap-3">
            <span className="w-28 shrink-0 font-mono text-xs text-muted">Redirect</span>
            <span className="break-all font-mono text-xs text-fg">{result.resolvedUrl}</span>
          </div>
        )}
        <div className="flex items-center gap-3">
          <span className="w-28 shrink-0 font-mono text-xs text-muted">Status</span>
          <span className="flex items-center gap-2">
            <StatusBadge status={result.status} />
            <span className="text-xs text-muted">{result.statusText}</span>
          </span>
        </div>
        {result.contentType && (
          <div className="flex items-start gap-3">
            <span className="w-28 shrink-0 font-mono text-xs text-muted">Content-Type</span>
            <span className="font-mono text-xs text-fg">{result.contentType}</span>
          </div>
        )}
      </div>
    </Section>
  );
}

function HeadersTable({ headers }: { headers: Array<{ key: string; value: string }> }) {
  if (headers.length === 0) return null;
  return (
    <Section label={`Response Headers (${headers.length})`}>
      {/* Mobile: stacked layout */}
      <div className="divide-y divide-[color-mix(in_srgb,var(--color-fg)_6%,transparent)] sm:hidden">
        {headers.map((h, i) => (
          <div key={i} className="px-4 py-3 space-y-1">
            <div className="font-mono text-xs text-muted break-all">{h.key}</div>
            <div className="text-xs text-fg break-all">{h.value}</div>
          </div>
        ))}
      </div>
      {/* Desktop: table layout */}
      <table className="hidden w-full text-sm sm:table">
        <thead>
          <tr className="border-b border-[color-mix(in_srgb,var(--color-fg)_8%,transparent)] bg-[color-mix(in_srgb,var(--color-fg)_4%,transparent)]">
            <th className="w-56 px-4 py-2.5 text-left font-mono text-xs font-medium text-muted">header</th>
            <th className="px-4 py-2.5 text-left font-mono text-xs font-medium text-muted">value</th>
          </tr>
        </thead>
        <tbody>
          {headers.map((h, i) => (
            <tr
              key={i}
              className="border-b border-[color-mix(in_srgb,var(--color-fg)_6%,transparent)] last:border-0 transition-colors hover:bg-[color-mix(in_srgb,var(--color-fg)_4%,transparent)]"
            >
              <td className="w-56 px-4 py-3 align-top">
                <span className="font-mono text-xs text-muted break-all">{h.key}</span>
              </td>
              <td className="px-4 py-3 align-top">
                <span className="text-xs text-fg break-all">{h.value}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}

function BodyPreview({ preview, truncated, bodySize }: { preview: string; truncated: boolean; bodySize: number }) {
  if (!preview) return null;

  const sizeLabel =
    bodySize >= 1024 * 1024
      ? `${(bodySize / (1024 * 1024)).toFixed(1)} MB`
      : bodySize >= 1024
        ? `${(bodySize / 1024).toFixed(1)} KB`
        : `${bodySize} B`;

  return (
    <Section label={`Body Preview (${sizeLabel}${truncated ? ', truncated' : ''})`}>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all px-4 py-3 font-mono text-xs text-fg">
        {preview}
        {truncated && (
          <span className="text-muted">{'\n\n'}… truncated at 2,000 characters</span>
        )}
      </pre>
    </Section>
  );
}

function DnsTable({ records }: { records: DnsRecord[] }) {
  if (records.length === 0) return null;
  return (
    <Section label={`DNS Records (${records.length})`}>
      {/* Mobile: card layout */}
      <div className="divide-y divide-[color-mix(in_srgb,var(--color-fg)_6%,transparent)] sm:hidden">
        {records.map((r, i) => (
          <div key={i} className="px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="inline-block rounded bg-[color-mix(in_srgb,var(--color-fg)_8%,transparent)] px-1.5 py-0.5 font-mono text-xs font-medium text-fg">
                {r.type}
              </span>
              <span className="font-mono text-xs text-muted">TTL {r.ttl}</span>
            </div>
            <div className="font-mono text-xs text-muted break-all">{r.name}</div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-fg break-all">{r.value}</span>
              {r.provider && (
                <span className="inline-block rounded-md border border-accent/30 bg-accent/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-accent">
                  {r.provider}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* Desktop: table layout */}
      <table className="hidden w-full text-sm sm:table">
        <thead>
          <tr className="border-b border-[color-mix(in_srgb,var(--color-fg)_8%,transparent)] bg-[color-mix(in_srgb,var(--color-fg)_4%,transparent)]">
            <th className="w-20 px-4 py-2.5 text-left font-mono text-xs font-medium text-muted">type</th>
            <th className="w-44 px-4 py-2.5 text-left font-mono text-xs font-medium text-muted">name</th>
            <th className="px-4 py-2.5 text-left font-mono text-xs font-medium text-muted">value</th>
            <th className="w-20 px-4 py-2.5 text-right font-mono text-xs font-medium text-muted">TTL</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => (
            <tr
              key={i}
              className="border-b border-[color-mix(in_srgb,var(--color-fg)_6%,transparent)] last:border-0 transition-colors hover:bg-[color-mix(in_srgb,var(--color-fg)_4%,transparent)]"
            >
              <td className="w-20 px-4 py-3 align-top">
                <span className="inline-block rounded bg-[color-mix(in_srgb,var(--color-fg)_8%,transparent)] px-1.5 py-0.5 font-mono text-xs font-medium text-fg">
                  {r.type}
                </span>
              </td>
              <td className="w-44 px-4 py-3 align-top">
                <span className="font-mono text-xs text-muted break-all">{r.name}</span>
              </td>
              <td className="px-4 py-3 align-top">
                <span className="text-xs text-fg break-all">{r.value}</span>
                {r.provider && (
                  <span className="ml-2 inline-block rounded-md border border-accent/30 bg-accent/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-accent">
                    {r.provider}
                  </span>
                )}
              </td>
              <td className="w-20 px-4 py-3 text-right align-top">
                <span className="font-mono text-xs text-muted">{r.ttl}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 font-mono text-xs font-medium uppercase tracking-widest text-muted">{label}</h2>
      <div className="overflow-x-auto rounded-xl border border-[color-mix(in_srgb,var(--color-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--color-fg)_3%,transparent)] shadow-sm">
        {children}
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function UrlInspector() {
  const [urlParam, setUrlParam] = useQueryState('url', { defaultValue: '' });
  const [input, setInput] = useState(urlParam);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const initialCheckDone = useRef(false);

  async function inspect(url: string) {
    if (!url.trim()) return;
    setError(null);
    setResult(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/inspect?url=${encodeURIComponent(url.trim())}`);
        const json: Result & { error?: string } = await res.json();
        if (!res.ok || json.error) {
          setError(json.error ?? 'Something went wrong');
        } else {
          setResult(json);
        }
      } catch {
        setError('Network error — could not reach the server');
      }
    });
  }

  useEffect(() => {
    if (urlParam && !initialCheckDone.current) {
      initialCheckDone.current = true;
      inspect(urlParam);
    }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUrlParam(input || null);
    inspect(input);
  }

  return (
    <main className=" py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">HTTP Inspector</h1>
        <p className="mt-1 text-sm text-muted">
          Inspect HTTP response headers, body preview, and DNS records for any URL.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="url"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="https://example.com"
            required
            className="flex-1 rounded-lg border border-[color-mix(in_srgb,var(--color-fg)_15%,transparent)] bg-[color-mix(in_srgb,var(--color-fg)_4%,transparent)] px-4 py-2.5 font-mono text-base text-fg shadow-sm outline-none placeholder:text-muted focus:border-[color-mix(in_srgb,var(--color-fg)_35%,transparent)] transition-colors"
          />
          <button
            type="submit"
            disabled={isPending}
            className="shrink-0 rounded-lg bg-fg px-5 py-2.5 font-mono text-sm font-medium text-bg shadow-sm transition-colors hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? 'Inspecting…' : 'Inspect'}
          </button>
        </div>
      </form>

      {isPending && (
        <div className="flex items-center gap-3 text-sm text-muted">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[color-mix(in_srgb,var(--color-fg)_20%,transparent)] border-t-muted" />
          Fetching HTTP response and DNS records…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {result && !isPending && (
        <div className="space-y-6">
          <RequestInfo result={result} />
          {result.httpError && (
            <div className="rounded-xl border border-yellow-400/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-600 dark:text-yellow-400">
              HTTP fetch failed: {result.httpError}
            </div>
          )}
          <HeadersTable headers={result.headers} />
          <BodyPreview preview={result.bodyPreview} truncated={result.truncated} bodySize={result.bodySize} />
          <DnsTable records={result.dns} />
          {result.dns.length === 0 && result.headers.length === 0 && (
            <p className="text-sm text-muted">No data returned.</p>
          )}
        </div>
      )}
    </main>
  );
}
