import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { identifyProvider } from './providers';

// ─── types ───────────────────────────────────────────────────────────────────

export interface InspectResult {
  url: string;
  resolvedUrl: string;
  status: number;
  statusText: string;
  headers: Array<{ key: string; value: string }>;
  bodyPreview: string;
  bodySize: number;
  contentType: string;
  truncated: boolean;
  dns: DnsRecord[];
}

export interface DnsRecord {
  type: string;
  name: string;
  value: string;
  ttl: number;
  provider?: string;
}

// ─── security: SSRF prevention ───────────────────────────────────────────────

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fd/i,
  /^fe80:/i,
  /^::ffff:(127|10|172\.(1[6-9]|2\d|3[01])|192\.168)\./i,
];

function isPrivateHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '[::1]') return true;
  return PRIVATE_IP_PATTERNS.some((p) => p.test(hostname));
}

function validateUrl(raw: string): { url: URL; error?: never } | { url?: never; error: string } {
  let parsed: URL;
  try {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    parsed = new URL(withScheme);
  } catch {
    return { error: 'Invalid URL' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { error: 'Only http and https are allowed' };
  }

  if (isPrivateHost(parsed.hostname)) {
    return { error: 'Requests to private/internal addresses are not allowed' };
  }

  return { url: parsed };
}

// ─── HTTP fetch with safety limits ───────────────────────────────────────────

const MAX_BODY_BYTES = 256 * 1024; // 256KB
const TIMEOUT_MS = 5000;

async function readBodyLimited(res: Response): Promise<{ text: string; size: number; truncated: boolean }> {
  const reader = res.body?.getReader();
  if (!reader) return { text: '', size: 0, truncated: false };

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  let truncated = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        // Take only the bytes we need to reach the limit
        const excess = totalBytes - MAX_BODY_BYTES;
        chunks.push(value.slice(0, value.byteLength - excess));
        truncated = true;
        break;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(truncated ? MAX_BODY_BYTES : totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const text = new TextDecoder('utf-8', { fatal: false }).decode(merged);
  return { text: text.slice(0, 2000), size: totalBytes, truncated };
}

const FETCH_HEADERS: HeadersInit = {
  'User-Agent': 'Mozilla/5.0 (compatible; HTTPInspector/1.0; +https://playground.0xjj.dev/httpinspector)',
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.9,ja;q=0.8',
};

function createFetchInit(): RequestInit {
  return {
    method: 'GET',
    headers: FETCH_HEADERS,
    redirect: 'manual',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  };
}

// Cloudflare Workers で同一オリジンへの fetch は 522 になるため、
// WORKER_SELF_REFERENCE service binding を経由して内部呼び出しにする。
async function fetchUrl(url: string): Promise<Response> {
  const init = createFetchInit();
  try {
    const { env } = await getCloudflareContext();
    const binding = (env as Record<string, { fetch: typeof fetch } | undefined>)
      .WORKER_SELF_REFERENCE;
    if (binding && new URL(url).hostname === 'playground.0xjj.dev') {
      return binding.fetch(new Request(url, init));
    }
  } catch {
    // dev 環境など Cloudflare context が存在しない場合は通常の fetch にフォールバック
  }
  return fetch(url, init);
}

async function fetchHttp(url: URL): Promise<{
  status: number;
  statusText: string;
  headers: Array<{ key: string; value: string }>;
  bodyPreview: string;
  bodySize: number;
  contentType: string;
  truncated: boolean;
  resolvedUrl: string;
}> {
  const res = await fetchUrl(url.href);

  const headers: Array<{ key: string; value: string }> = [];
  res.headers.forEach((value, key) => {
    headers.push({ key, value });
  });

  const resolvedUrl =
    res.status >= 300 && res.status < 400
      ? res.headers.get('location') ?? url.href
      : url.href;

  // Validate redirect target for SSRF
  if (resolvedUrl !== url.href) {
    const redirectValidation = validateUrl(resolvedUrl);
    if (redirectValidation.error) {
      return {
        status: res.status,
        statusText: res.statusText,
        headers,
        bodyPreview: '',
        bodySize: 0,
        contentType: res.headers.get('content-type') ?? '',
        truncated: false,
        resolvedUrl: `(blocked: ${redirectValidation.error})`,
      };
    }
  }

  const { text, size, truncated } = await readBodyLimited(res);

  return {
    status: res.status,
    statusText: res.statusText,
    headers,
    bodyPreview: text,
    bodySize: size,
    contentType: res.headers.get('content-type') ?? '',
    truncated,
    resolvedUrl,
  };
}

// ─── DNS-over-HTTPS via Cloudflare ───────────────────────────────────────────

interface DohAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

const DNS_TYPE_MAP: Record<number, string> = {
  1: 'A',
  2: 'NS',
  5: 'CNAME',
  15: 'MX',
  16: 'TXT',
  28: 'AAAA',
};

const QUERY_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT'] as const;

async function lookupDns(hostname: string): Promise<DnsRecord[]> {
  const results = await Promise.allSettled(
    QUERY_TYPES.map(async (type) => {
      const res = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=${type}`,
        {
          headers: { Accept: 'application/dns-json' },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        },
      );
      if (!res.ok) return [];
      const json: { Answer?: DohAnswer[] } = await res.json();
      return (json.Answer ?? []).map((a) => ({
        type: DNS_TYPE_MAP[a.type] ?? String(a.type),
        name: a.name.replace(/\.$/, ''),
        value: a.data.replace(/\.$/, ''),
        ttl: a.TTL,
      }));
    }),
  );

  const records: DnsRecord[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    if (r.status === 'fulfilled') {
      for (const rec of r.value) {
        const key = `${rec.type}:${rec.name}:${rec.value}`;
        if (!seen.has(key)) {
          seen.add(key);
          records.push(rec);
        }
      }
    }
  }

  // Identify providers for A/AAAA records
  for (const rec of records) {
    if (rec.type === 'A' || rec.type === 'AAAA') {
      rec.provider = identifyProvider(rec.value);
    }
  }

  // Sort: A, AAAA, CNAME, MX, NS, TXT
  const order = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT'];
  records.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
  return records;
}

// ─── handler ─────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('url');
  if (!raw) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  const validation = validateUrl(raw);
  if (validation.error) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const url = validation.url;

  try {
    // Run HTTP fetch and DNS lookup in parallel
    const [httpResult, dnsResult] = await Promise.allSettled([
      fetchHttp(url),
      lookupDns(url.hostname),
    ]);

    const http =
      httpResult.status === 'fulfilled'
        ? httpResult.value
        : {
            status: 0,
            statusText: 'Failed',
            headers: [] as Array<{ key: string; value: string }>,
            bodyPreview: '',
            bodySize: 0,
            contentType: '',
            truncated: false,
            resolvedUrl: url.href,
          };

    const dns = dnsResult.status === 'fulfilled' ? dnsResult.value : [];

    const httpError =
      httpResult.status === 'rejected'
        ? httpResult.reason instanceof Error
          ? httpResult.reason.message
          : 'Unknown error'
        : undefined;

    const result: InspectResult & { httpError?: string } = {
      url: raw,
      resolvedUrl: http.resolvedUrl,
      status: http.status,
      statusText: http.statusText,
      headers: http.headers,
      bodyPreview: http.bodyPreview,
      bodySize: http.bodySize,
      contentType: http.contentType,
      truncated: http.truncated,
      dns,
      httpError,
    };

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: `Failed: ${msg}` }, { status: 500 });
  }
}
