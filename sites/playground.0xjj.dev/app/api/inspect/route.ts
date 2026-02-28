import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { identifyProvider } from './providers';

// ─── types ───────────────────────────────────────────────────────────────────

export interface TechDetection {
  name: string;
  category: 'framework' | 'language' | 'server' | 'platform' | 'cms';
}

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
  technologies: TechDetection[];
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

// ─── CF proxy header filtering ────────────────────────────────────────────────

function isCfProxyHeader(key: string): boolean {
  if (key.startsWith('cf-')) return true;
  const CF_HEADERS = new Set(['nel', 'report-to']);
  return CF_HEADERS.has(key);
}

// ─── Technology detection ────────────────────────────────────────────────────

function detectTechnologies(
  headers: Array<{ key: string; value: string }>,
  body: string,
): TechDetection[] {
  const techs: TechDetection[] = [];
  const seen = new Set<string>();

  function add(name: string, category: TechDetection['category']) {
    if (!seen.has(name)) {
      seen.add(name);
      techs.push({ name, category });
    }
  }

  // ── header-based detection ──
  for (const { key, value } of headers) {
    const k = key.toLowerCase();
    const v = value.toLowerCase();

    if (k === 'x-powered-by') {
      if (v.includes('next.js')) add('Next.js', 'framework');
      if (v.includes('express')) add('Express', 'framework');
      if (v.includes('nuxt')) add('Nuxt', 'framework');
      if (v.includes('php')) add('PHP', 'language');
      if (v.includes('asp.net')) add('ASP.NET', 'framework');
    }

    if (k === 'x-generator' || k === 'generator') {
      if (v.includes('astro')) add('Astro', 'framework');
      if (v.includes('hugo')) add('Hugo', 'framework');
      if (v.includes('gatsby')) add('Gatsby', 'framework');
      if (v.includes('wordpress')) add('WordPress', 'cms');
      if (v.includes('drupal')) add('Drupal', 'cms');
      if (v.includes('jekyll')) add('Jekyll', 'framework');
    }

    if (k === 'server') {
      if (v.includes('nginx')) add('nginx', 'server');
      if (v.includes('apache')) add('Apache', 'server');
      if (v.includes('vercel')) add('Vercel', 'platform');
      if (v.includes('cloudflare')) add('Cloudflare', 'platform');
      if (v.includes('litespeed')) add('LiteSpeed', 'server');
      if (v.includes('deno')) add('Deno', 'server');
    }

    if (k === 'x-vercel-id') add('Vercel', 'platform');
    if (k === 'x-amz-cf-id' || k === 'x-amz-cf-pop') add('AWS CloudFront', 'platform');
    if (k === 'x-drupal-cache' || k === 'x-drupal-dynamic-cache') add('Drupal', 'cms');
    if (k === 'x-shopify-stage') add('Shopify', 'platform');
    if (k === 'fly-request-id') add('Fly.io', 'platform');
    if (k === 'x-firebase-hosting') add('Firebase Hosting', 'platform');
  }

  // ── body-based detection (HTML) ──
  if (body) {
    // Meta generator tag
    const genMatch = body.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i)
      ?? body.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']generator["']/i);
    if (genMatch) {
      const gen = genMatch[1].toLowerCase();
      if (gen.includes('wordpress')) add('WordPress', 'cms');
      if (gen.includes('drupal')) add('Drupal', 'cms');
      if (gen.includes('joomla')) add('Joomla', 'cms');
      if (gen.includes('hugo')) add('Hugo', 'framework');
      if (gen.includes('jekyll')) add('Jekyll', 'framework');
      if (gen.includes('astro')) add('Astro', 'framework');
      if (gen.includes('gatsby')) add('Gatsby', 'framework');
      if (gen.includes('ghost')) add('Ghost', 'cms');
    }

    // Next.js
    if (body.includes('__NEXT_DATA__') || body.includes('/_next/static')) add('Next.js', 'framework');

    // Nuxt
    if (body.includes('__NUXT__') || body.includes('/_nuxt/')) add('Nuxt', 'framework');

    // Astro
    if (body.includes('astro-island') || /data-astro-cid/.test(body)) add('Astro', 'framework');

    // SvelteKit
    if (body.includes('__sveltekit') || body.includes('/_app/immutable/')) add('SvelteKit', 'framework');

    // Remix
    if (body.includes('__remixContext') || body.includes('data-remix')) add('Remix', 'framework');

    // Gatsby
    if (body.includes('___gatsby') || body.includes('gatsby-')) add('Gatsby', 'framework');

    // Vue.js (generic)
    if (/data-v-[a-f0-9]/.test(body) && !seen.has('Nuxt')) add('Vue.js', 'framework');

    // Angular
    if (body.includes('ng-version') || body.includes('ng-app')) add('Angular', 'framework');

    // React (generic, low priority)
    if (body.includes('data-reactroot') || body.includes('__reactFiber')) {
      if (!seen.has('Next.js') && !seen.has('Gatsby') && !seen.has('Remix')) add('React', 'framework');
    }

    // WordPress
    if (body.includes('wp-content') || body.includes('wp-includes')) add('WordPress', 'cms');

    // Shopify
    if (body.includes('cdn.shopify.com') || body.includes('Shopify.theme')) add('Shopify', 'platform');

    // Wix
    if (body.includes('wix.com') || body.includes('_wixCIDX')) add('Wix', 'platform');

    // Squarespace
    if (body.includes('squarespace.com') || body.includes('Static.SQUARESPACE')) add('Squarespace', 'platform');

    // Laravel
    if (body.includes('laravel') || body.includes('csrf-token')) {
      // csrf-token alone is too generic, combine with other signals
      if (body.includes('laravel')) add('Laravel', 'framework');
    }

    // Ruby on Rails
    if (body.includes('csrf-param') && body.includes('csrf-token') && body.includes('authenticity_token')) {
      add('Ruby on Rails', 'framework');
    }

    // Django
    if (body.includes('csrfmiddlewaretoken') || body.includes('__django')) add('Django', 'framework');
  }

  return techs;
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
  allHeaders: Array<{ key: string; value: string }>;
  bodyPreview: string;
  bodySize: number;
  contentType: string;
  truncated: boolean;
  resolvedUrl: string;
}> {
  const res = await fetchUrl(url.href);

  const allHeaders: Array<{ key: string; value: string }> = [];
  res.headers.forEach((value, key) => {
    allHeaders.push({ key, value });
  });
  const headers = allHeaders.filter((h) => !isCfProxyHeader(h.key));

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
        allHeaders,
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
    allHeaders,
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
            allHeaders: [] as Array<{ key: string; value: string }>,
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

    // Use allHeaders (including CF headers) for tech detection
    const technologies = detectTechnologies(http.allHeaders, http.bodyPreview);

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
      technologies,
      httpError,
    };

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: `Failed: ${msg}` }, { status: 500 });
  }
}
