'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useQueryState } from 'nuqs';
import type { InspectResult, DnsRecord, TechDetection } from '../../api/inspect/route';
import CustomHeaders from '../../components/CustomHeaders';

type Result = InspectResult & { httpError?: string };

// ─── Security Audit Scoring ──────────────────────────────────────────────────

type AuditItem = {
  category: string;
  score: number;
  maxScore: number;
  severity: 'critical' | 'warning' | 'info' | 'pass';
  findings: string[];
};

type AuditResult = {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  items: AuditItem[];
};

function computeSecurityAudit(headers: Array<{ key: string; value: string }>): AuditResult {
  const map = new Map<string, string[]>();
  for (const h of headers) {
    const k = h.key.toLowerCase();
    const existing = map.get(k);
    if (existing) existing.push(h.value);
    else map.set(k, [h.value]);
  }
  const get = (k: string) => map.get(k)?.[0] ?? null;
  const has = (k: string) => map.has(k);

  const items: AuditItem[] = [];

  // 1. HSTS (25 pts)
  {
    const val = get('strict-transport-security');
    let score = 0;
    const findings: string[] = [];
    if (!val) {
      findings.push('Missing Strict-Transport-Security header');
    } else {
      score = 10;
      findings.push('Strict-Transport-Security is present');
      const maxAge = val.match(/max-age=(\d+)/i);
      if (maxAge && parseInt(maxAge[1], 10) >= 31536000) {
        score += 5;
      } else {
        findings.push('max-age should be at least 31536000 (1 year)');
      }
      if (/includeSubDomains/i.test(val)) {
        score += 5;
      } else {
        findings.push('Missing includeSubDomains directive');
      }
      if (/preload/i.test(val)) {
        score += 5;
      } else {
        findings.push('Missing preload directive');
      }
    }
    items.push({
      category: 'HSTS',
      score,
      maxScore: 25,
      severity: score === 0 ? 'critical' : score < 20 ? 'warning' : 'pass',
      findings,
    });
  }

  // 2. CSP (25 pts)
  {
    const val = get('content-security-policy');
    let score = 0;
    const findings: string[] = [];
    if (!val) {
      findings.push('Missing Content-Security-Policy header');
    } else {
      score = 10;
      findings.push('Content-Security-Policy is present');
      if (/default-src/i.test(val)) {
        score += 5;
        findings.push('default-src directive found');
      } else {
        findings.push('Missing default-src directive');
      }
      if (/script-src/i.test(val)) {
        score += 5;
        findings.push('script-src directive found');
      } else {
        findings.push('Missing script-src directive');
      }
      if (!/unsafe-inline/i.test(val) && !/unsafe-eval/i.test(val)) {
        score += 5;
      } else {
        findings.push("Uses 'unsafe-inline' or 'unsafe-eval'");
      }
    }
    items.push({
      category: 'CSP',
      score,
      maxScore: 25,
      severity: score === 0 ? 'critical' : score < 20 ? 'warning' : 'pass',
      findings,
    });
  }

  // 3. X-Content-Type-Options (5 pts)
  {
    const val = get('x-content-type-options');
    let score = 0;
    const findings: string[] = [];
    if (!val) {
      findings.push('Missing X-Content-Type-Options header');
    } else if (/nosniff/i.test(val)) {
      score = 5;
      findings.push('X-Content-Type-Options: nosniff');
    } else {
      score = 2;
      findings.push(`Unexpected value: ${val}`);
    }
    items.push({
      category: 'X-Content-Type-Options',
      score,
      maxScore: 5,
      severity: score === 5 ? 'pass' : score > 0 ? 'warning' : 'warning',
      findings,
    });
  }

  // 4. X-Frame-Options / frame-ancestors (10 pts)
  {
    const xfo = get('x-frame-options');
    const csp = get('content-security-policy');
    const hasFrameAncestors = csp ? /frame-ancestors/i.test(csp) : false;
    let score = 0;
    const findings: string[] = [];
    if (hasFrameAncestors) {
      score = 10;
      findings.push('CSP frame-ancestors directive found');
    } else if (xfo) {
      score = 7;
      findings.push(`X-Frame-Options: ${xfo}`);
      findings.push('Consider using CSP frame-ancestors instead');
    } else {
      findings.push('Missing X-Frame-Options and CSP frame-ancestors');
    }
    items.push({
      category: 'X-Frame-Options',
      score,
      maxScore: 10,
      severity: score === 0 ? 'warning' : score < 10 ? 'info' : 'pass',
      findings,
    });
  }

  // 5. Referrer-Policy (5 pts)
  {
    const val = get('referrer-policy');
    let score = 0;
    const findings: string[] = [];
    if (!val) {
      findings.push('Missing Referrer-Policy header');
    } else {
      const safe = ['no-referrer', 'same-origin', 'strict-origin', 'strict-origin-when-cross-origin'];
      if (safe.some((s) => val.toLowerCase().includes(s))) {
        score = 5;
        findings.push(`Referrer-Policy: ${val}`);
      } else {
        score = 3;
        findings.push(`Referrer-Policy: ${val} (consider a stricter policy)`);
      }
    }
    items.push({
      category: 'Referrer-Policy',
      score,
      maxScore: 5,
      severity: score === 5 ? 'pass' : score > 0 ? 'info' : 'warning',
      findings,
    });
  }

  // 6. Permissions-Policy (5 pts)
  {
    const val = get('permissions-policy');
    let score = 0;
    const findings: string[] = [];
    if (!val) {
      findings.push('Missing Permissions-Policy header');
    } else {
      score = 5;
      findings.push('Permissions-Policy is present');
    }
    items.push({
      category: 'Permissions-Policy',
      score,
      maxScore: 5,
      severity: score === 5 ? 'pass' : 'warning',
      findings,
    });
  }

  // 7. Cross-Origin (COOP/COEP/CORP) (10 pts)
  {
    let score = 0;
    const findings: string[] = [];
    const coop = get('cross-origin-opener-policy');
    const coep = get('cross-origin-embedder-policy');
    const corp = get('cross-origin-resource-policy');
    if (coop) { score += 4; findings.push(`COOP: ${coop}`); } else { findings.push('Missing Cross-Origin-Opener-Policy'); }
    if (coep) { score += 3; findings.push(`COEP: ${coep}`); } else { findings.push('Missing Cross-Origin-Embedder-Policy'); }
    if (corp) { score += 3; findings.push(`CORP: ${corp}`); } else { findings.push('Missing Cross-Origin-Resource-Policy'); }
    items.push({
      category: 'Cross-Origin',
      score,
      maxScore: 10,
      severity: score === 0 ? 'warning' : score < 10 ? 'info' : 'pass',
      findings,
    });
  }

  // 8. Cookies (15 pts)
  {
    const cookies = map.get('set-cookie');
    if (!cookies) {
      items.push({
        category: 'Cookies',
        score: 15,
        maxScore: 15,
        severity: 'pass',
        findings: ['No cookies set (N/A — full score)'],
      });
    } else {
      let score = 5; // base for having cookies
      const findings: string[] = [`${cookies.length} cookie(s) found`];
      const allSecure = cookies.every((c) => /;\s*Secure/i.test(c));
      const allHttpOnly = cookies.every((c) => /;\s*HttpOnly/i.test(c));
      const allSameSite = cookies.every((c) => /;\s*SameSite=(Strict|Lax|None)/i.test(c));
      if (allSecure) { score += 4; findings.push('All cookies have Secure flag'); } else { findings.push('Some cookies missing Secure flag'); }
      if (allHttpOnly) { score += 3; findings.push('All cookies have HttpOnly flag'); } else { findings.push('Some cookies missing HttpOnly flag'); }
      if (allSameSite) { score += 3; findings.push('All cookies have SameSite attribute'); } else { findings.push('Some cookies missing SameSite attribute'); }
      items.push({
        category: 'Cookies',
        score,
        maxScore: 15,
        severity: score >= 13 ? 'pass' : score >= 8 ? 'warning' : 'critical',
        findings,
      });
    }
  }

  // Penalty deductions
  let penalty = 0;
  const penaltyFindings: string[] = [];
  const server = get('server');
  if (server && /\/\d/.test(server)) {
    penalty += 1;
    penaltyFindings.push(`Server header exposes version info: ${server}`);
  }
  if (has('x-powered-by')) {
    penalty += 2;
    penaltyFindings.push(`X-Powered-By header present: ${get('x-powered-by')}`);
  }
  if (penaltyFindings.length > 0) {
    items.push({
      category: 'Info Leakage',
      score: -penalty,
      maxScore: 0,
      severity: 'warning',
      findings: penaltyFindings,
    });
  }

  const raw = items.reduce((sum, i) => sum + i.score, 0);
  const score = Math.max(0, Math.min(100, raw));
  const grade: AuditResult['grade'] =
    score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : score >= 50 ? 'E' : 'F';

  return { score, grade, items };
}

// ─── Security Audit UI ───────────────────────────────────────────────────────

const GRADE_COLORS: Record<AuditResult['grade'], string> = {
  A: 'text-green-500 border-green-500/40 bg-green-500/10',
  B: 'text-lime-500 border-lime-500/40 bg-lime-500/10',
  C: 'text-yellow-500 border-yellow-500/40 bg-yellow-500/10',
  D: 'text-orange-500 border-orange-500/40 bg-orange-500/10',
  E: 'text-red-400 border-red-400/40 bg-red-400/10',
  F: 'text-red-600 border-red-600/40 bg-red-600/10',
};

const SEVERITY_BAR: Record<AuditItem['severity'], string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-gray-400',
  pass: 'bg-green-500',
};

function SecurityAudit({ headers }: { headers: Array<{ key: string; value: string }> }) {
  const audit = computeSecurityAudit(headers);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <Section label="ヘッダーセキュリティ監査">
      <div className="px-4 py-4">
        {/* Grade + Score */}
        <div className="flex items-center gap-4 mb-4">
          <div className={`flex h-16 w-16 items-center justify-center rounded-xl border-2 text-2xl font-bold ${GRADE_COLORS[audit.grade]}`}>
            {audit.grade}
          </div>
          <div>
            <div className="text-lg font-semibold text-fg">
              {audit.score} <span className="text-sm font-normal text-muted">/ 100</span>
            </div>
            <p className="text-xs text-muted">この監査はHTTPレスポンスヘッダーのみを評価します。</p>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-2">
          {audit.items.map((item, i) => {
            const pct = item.maxScore > 0 ? Math.max(0, (item.score / item.maxScore) * 100) : 0;
            const isExpanded = expandedIdx === i;
            const isPenalty = item.maxScore === 0;
            return (
              <div key={item.category}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--color-fg)_6%,transparent)]"
                  onClick={() => setExpandedIdx(isExpanded ? null : i)}
                >
                  <span className="w-40 shrink-0 font-mono text-xs text-fg">{item.category}</span>
                  {isPenalty ? (
                    <span className="flex-1 text-xs text-amber-500 font-medium">{item.score} pts</span>
                  ) : (
                    <div className="flex flex-1 items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-[color-mix(in_srgb,var(--color-fg)_10%,transparent)]">
                        <div
                          className={`h-full rounded-full transition-all ${SEVERITY_BAR[item.severity]}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-12 text-right font-mono text-[11px] text-muted">
                        {item.score}/{item.maxScore}
                      </span>
                    </div>
                  )}
                  <svg
                    className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isExpanded && (
                  <div className="ml-2 mt-1 space-y-0.5 border-l-2 border-[color-mix(in_srgb,var(--color-fg)_10%,transparent)] pl-4 pb-1">
                    {item.findings.map((f, j) => (
                      <p key={j} className="text-xs text-muted">{f}</p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

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
    <Section label="リクエスト">
      <div className="space-y-2 px-4 py-3 text-sm">
        <div className="flex items-start gap-3">
          <span className="w-28 shrink-0 font-mono text-xs text-muted">URL</span>
          <span className="break-all font-mono text-xs text-fg">{result.url}</span>
        </div>
        {result.resolvedUrl !== result.url && (
          <div className="flex items-start gap-3">
            <span className="w-28 shrink-0 font-mono text-xs text-muted">リダイレクト</span>
            <span className="break-all font-mono text-xs text-fg">{result.resolvedUrl}</span>
          </div>
        )}
        <div className="flex items-center gap-3">
          <span className="w-28 shrink-0 font-mono text-xs text-muted">ステータス</span>
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
  framework: 'フレームワーク',
  language: '言語',
  server: 'サーバー',
  platform: 'プラットフォーム',
  cms: 'CMS',
};

function Technologies({ technologies }: { technologies: TechDetection[] }) {
  if (technologies.length === 0) return null;
  return (
    <Section label="検出された技術">
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
    category: 'コンテンツ',
    headers: [
      { key: 'content-type', description: 'MIME type of the response' },
      { key: 'content-language', description: 'Language of the content' },
      { key: 'content-encoding', description: 'Compression encoding' },
      { key: 'content-disposition', description: 'Download/inline behavior' },
    ],
  },
  {
    category: 'キャッシュ',
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
    category: 'セキュリティ',
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
    category: 'リダイレクト',
    headers: [
      { key: 'location', description: 'Redirect target URL' },
      { key: 'x-redirect-by', description: 'Redirect origin hint' },
    ],
  },
  {
    category: 'ヒント & プリロード',
    headers: [
      { key: 'link', description: 'Preload / preconnect hints' },
      { key: 'x-dns-prefetch-control', description: 'DNS prefetch toggle' },
      { key: 'timing-allow-origin', description: 'Resource Timing API access' },
      { key: 'origin-trial', description: 'Chrome Origin Trial tokens' },
    ],
  },
  {
    category: '認証',
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
    <Section label={`レスポンスヘッダー (${headers.length})`}>
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
              その他
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
    <Section label={`ボディプレビュー (${sizeLabel}${truncated ? ', truncated' : ''})`}>
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all px-4 py-3 font-mono text-xs text-fg">
        {preview}
        {truncated && (
          <span className="text-muted">{'\n\n'}... 256 KBで切り詰め</span>
        )}
      </pre>
    </Section>
  );
}

function DnsTable({ records }: { records: DnsRecord[] }) {
  if (records.length === 0) return null;
  return (
    <Section label={`DNSレコード (${records.length})`}>
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
  const customHeadersRef = useRef<Record<string, string>>({});

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

    const headers = customHeadersRef.current;
    const hasCustomHeaders = Object.keys(headers).length > 0;

    startTransition(async () => {
      try {
        const res = hasCustomHeaders
          ? await fetch('/api/inspect', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url, headers }),
            })
          : await fetch(`/api/inspect?url=${encodeURIComponent(url)}`);
        const json: Result & { error?: string } = await res.json();
        if (!res.ok || json.error) {
          setError(json.error ?? 'エラーが発生しました');
        } else {
          setResult(json);
        }
      } catch {
        setError('ネットワークエラー — サーバーに接続できませんでした');
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
          任意のURLのHTTPレスポンスヘッダー・ボディプレビュー・DNSレコードを確認します。
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
            {isPending ? '検査中...' : '検査'}
          </button>
        </div>
      </form>

      <CustomHeaders onChange={(h) => { customHeadersRef.current = h; }} />

      {isPending && (
        <div className="flex items-center gap-3 text-sm text-muted">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[color-mix(in_srgb,var(--color-fg)_20%,transparent)] border-t-muted" />
          HTTPレスポンスとDNSレコードを取得中...
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
              HTTPフェッチに失敗: {result.httpError}
            </div>
          )}
          <SecurityAudit headers={result.headers} />
          <ResponseHeaders headers={result.headers} />
          <BodyPreview preview={result.bodyPreview} truncated={result.truncated} bodySize={result.bodySize} />
          <DnsTable records={result.dns} />
          {result.dns.length === 0 && result.headers.length === 0 && (
            <p className="text-sm text-muted">データが返されませんでした。</p>
          )}
        </div>
      )}
    </main>
  );
}
