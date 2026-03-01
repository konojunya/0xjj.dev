'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useQueryState } from 'nuqs';
import type { InspectResult, DnsRecord, TechDetection } from '../../api/inspect/route';

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

const CATEGORY_LABEL: Record<TechDetection['category'], string> = {
  framework: 'Framework',
  language: 'Language',
  server: 'Server',
  platform: 'Platform',
  cms: 'CMS',
};

function Technologies({ technologies }: { technologies: TechDetection[] }) {
  if (technologies.length === 0) return null;
  return (
    <Section label="Detected Technologies">
      <div className="flex flex-wrap gap-2 px-4 py-3">
        {technologies.map((t) => (
          <span
            key={t.name}
            className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent"
          >
            {t.name}
            <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent/70">
              {CATEGORY_LABEL[t.category]}
            </span>
          </span>
        ))}
      </div>
    </Section>
  );
}

// ─── Categorized response headers ─────────────────────────────────────────────

const HEADER_CATEGORIES: Array<{ category: string; headers: Array<{ key: string; description: string }> }> = [

  {
    category: 'Content',
    headers: [
      { key: 'content-type', description: 'MIME type of the response' },
      { key: 'content-language', description: 'Language of the content' },
      { key: 'content-encoding', description: 'Compression encoding' },
      { key: 'content-disposition', description: 'Download/inline behavior' },
    ],
  },
  {
    category: 'Caching',
    headers: [
      { key: 'cache-control', description: 'Caching directives' },
      { key: 'vary', description: 'Headers that affect caching' },
      { key: 'etag', description: 'Resource version identifier' },
      { key: 'last-modified', description: 'Last modification timestamp' },
      { key: 'age', description: 'Time in cache (seconds)' },
      { key: 'expires', description: 'Expiration date for the resource' },
    ],
  },

  {
    category: 'Security',
    headers: [
      { key: 'x-content-type-options', description: 'Prevent MIME-type sniffing' },
      { key: 'x-frame-options', description: 'Controls iframe embedding' },
      { key: 'strict-transport-security', description: 'HSTS — force HTTPS connections' },
      { key: 'referrer-policy', description: 'Controls Referer header behavior' },
      { key: 'content-security-policy', description: 'CSP — control allowed resource origins' },
      { key: 'content-security-policy-report-only', description: 'CSP report-only mode' },
      { key: 'permissions-policy', description: 'Controls browser feature access' },
      { key: 'cross-origin-opener-policy', description: 'COOP — window isolation' },
      { key: 'cross-origin-embedder-policy', description: 'COEP — cross-origin isolation' },
      { key: 'cross-origin-resource-policy', description: 'CORP — resource sharing control' },
      { key: 'x-xss-protection', description: 'Legacy XSS filter (deprecated)' },
    ],
  },
  {
    category: 'Cookies',
    headers: [
      { key: 'set-cookie', description: 'Set browser cookies' },
    ],
  },
  {
    category: 'CORS',
    headers: [
      { key: 'access-control-allow-origin', description: 'Allowed request origins' },
      { key: 'access-control-allow-methods', description: 'Allowed HTTP methods' },
      { key: 'access-control-allow-headers', description: 'Allowed request headers' },
      { key: 'access-control-expose-headers', description: 'Headers exposed to JS' },
      { key: 'access-control-allow-credentials', description: 'Allow credentials' },
      { key: 'access-control-max-age', description: 'Preflight cache duration' },
    ],
  },

  {
    category: 'Redirect',
    headers: [
      { key: 'location', description: 'Redirect target URL' },
      { key: 'x-redirect-by', description: 'Redirect origin hint' },
    ],
  },
  {
    category: 'Hints & Preload',
    headers: [
      { key: 'link', description: 'Preload / preconnect hints' },
      { key: 'x-dns-prefetch-control', description: 'DNS prefetch toggle' },
      { key: 'timing-allow-origin', description: 'Resource Timing API access' },
      { key: 'origin-trial', description: 'Chrome Origin Trial tokens' },
    ],
  },
  {
    category: 'Auth',
    headers: [
      { key: 'www-authenticate', description: 'Authentication challenge' },
    ],
  },
  {
    category: 'SEO',
    headers: [
      { key: 'x-robots-tag', description: 'Search engine directives' },
    ],
  },
];

// Build a set of all well-known header keys for quick lookup
const KNOWN_HEADER_KEYS = new Set(
  HEADER_CATEGORIES.flatMap((cat) => cat.headers.map((h) => h.key)),
);

function ResponseHeaders({ headers }: { headers: Array<{ key: string; value: string }> }) {
  if (headers.length === 0) return null;

  // Build a map: key → values (multiple values possible, e.g. set-cookie)
  const headerMap = new Map<string, string[]>();
  for (const h of headers) {
    const k = h.key.toLowerCase();
    const existing = headerMap.get(k);
    if (existing) existing.push(h.value);
    else headerMap.set(k, [h.value]);
  }

  // Collect uncategorized headers into "Other"
  const otherHeaders: Array<{ key: string; values: string[] }> = [];
  for (const [k, values] of headerMap) {
    if (!KNOWN_HEADER_KEYS.has(k)) {
      otherHeaders.push({ key: k, values });
    }
  }

  return (
    <Section label={`Response Headers (${headers.length})`}>
      <div className="divide-y divide-[color-mix(in_srgb,var(--color-fg)_6%,transparent)]">
        {HEADER_CATEGORIES.map((cat) => {
          // Skip categories that have zero present headers
          const hasAny = cat.headers.some((h) => headerMap.has(h.key));
          if (!hasAny) return null;
          return (
            <div key={cat.category} className="px-4 py-3">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                {cat.category}
              </h3>
              <div className="space-y-1.5">
                {cat.headers.map((h) => {
                  const values = headerMap.get(h.key);
                  const isSet = !!values;
                  return (
                    <div key={h.key} className="flex items-start gap-2">
                      <span
                        className={`mt-0.5 shrink-0 text-[10px] font-bold ${isSet ? 'text-green-600' : 'text-[color-mix(in_srgb,var(--color-fg)_20%,transparent)]'}`}
                      >
                        {isSet ? '✓' : '—'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span
                            className={`font-mono text-xs ${isSet ? 'text-fg' : 'text-[color-mix(in_srgb,var(--color-fg)_30%,transparent)]'}`}
                          >
                            {h.key}
                          </span>
                          <span className="text-[10px] text-muted hidden sm:inline">{h.description}</span>
                        </div>
                        {values?.map((v, i) => (
                          <div
                            key={i}
                            className="mt-0.5 rounded bg-[color-mix(in_srgb,var(--color-fg)_5%,transparent)] px-2 py-1 font-mono text-[11px] text-fg break-all"
                          >
                            {v}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {otherHeaders.length > 0 && (
          <div className="px-4 py-3">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Other
            </h3>
            <div className="space-y-1.5">
              {otherHeaders.map((h) => (
                <div key={h.key} className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-[10px] font-bold text-green-600">✓</span>
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-xs text-fg">{h.key}</span>
                    {h.values.map((v, i) => (
                      <div
                        key={i}
                        className="mt-0.5 rounded bg-[color-mix(in_srgb,var(--color-fg)_5%,transparent)] px-2 py-1 font-mono text-[11px] text-fg break-all"
                      >
                        {v}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
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
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all px-4 py-3 font-mono text-xs text-fg">
        {preview}
        {truncated && (
          <span className="text-muted">{'\n\n'}… truncated at 256 KB</span>
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
  const [input, setInput] = useState(() => urlParam.replace(/^https?:\/\//i, ''));
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const initialCheckDone = useRef(false);

  function normalizeUrl(raw: string): string {
    const v = raw.trim();
    if (/^https?:\/\//i.test(v)) return v;
    return `https://${v}`;
  }

  async function inspect(raw: string) {
    if (!raw.trim()) return;
    const url = normalizeUrl(raw);
    setError(null);
    setResult(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/inspect?url=${encodeURIComponent(url)}`);
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
    const url = normalizeUrl(input);
    setUrlParam(input.trim() ? url : null);
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
          <div
            className="flex flex-1 cursor-text items-center rounded-lg border border-[color-mix(in_srgb,var(--color-fg)_15%,transparent)] bg-[color-mix(in_srgb,var(--color-fg)_4%,transparent)] shadow-sm transition-colors focus-within:border-[color-mix(in_srgb,var(--color-fg)_35%,transparent)]"
            onClick={(e) => { if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'SPAN') (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus(); }}
          >
            <span className="select-none pl-4 font-mono text-base text-muted">https://</span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value.replace(/^https?:\/\//i, ''))}
              placeholder="example.com"
              required
              className="flex-1 bg-transparent py-2.5 pr-4 pl-0 font-mono text-base text-fg outline-none placeholder:text-muted"
            />
          </div>
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
          <Technologies technologies={result.technologies} />
          {result.httpError && (
            <div className="rounded-xl border border-yellow-400/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-600 dark:text-yellow-400">
              HTTP fetch failed: {result.httpError}
            </div>
          )}
          <ResponseHeaders headers={result.headers} />
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
