import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const FETCH_INIT = {
  headers: {
    'User-Agent':
      'Mozilla/5.0 (compatible; OGPChecker/1.0; +https://playground.0xjj.dev/ogpchecker)',
    Accept: 'text/html,application/xhtml+xml',
    'Accept-Language': 'en-US,en;q=0.9,ja;q=0.8',
  },
  redirect: 'follow' as const,
};

// Cloudflare Workers で同一オリジンへの fetch は 522 になるため、
// WORKER_SELF_REFERENCE service binding を経由して内部呼び出しにする。
async function fetchUrl(url: string): Promise<Response> {
  try {
    const { env } = getCloudflareContext();
    const binding = (env as Record<string, { fetch: typeof fetch } | undefined>)
      .WORKER_SELF_REFERENCE;
    if (binding && new URL(url).hostname === 'playground.0xjj.dev') {
      return binding.fetch(new Request(url, FETCH_INIT));
    }
  } catch {
    // dev 環境など Cloudflare context が存在しない場合は通常の fetch にフォールバック
  }
  return fetch(url, FETCH_INIT);
}

export interface MetaEntry {
  key: string;
  content: string;
  attr: 'name' | 'property' | 'http-equiv' | 'rel' | 'title';
}

export interface MetaResult {
  url: string;
  finalUrl: string;
  title: string;
  entries: MetaEntry[];
}

function parseAttrs(attrStr: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of attrStr.matchAll(/(\w[\w:-]*)=(?:"([^"]*)"|'([^']*)'|(\S+))/g)) {
    attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return attrs;
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function extract(html: string): { title: string; entries: MetaEntry[] } {
  const entries: MetaEntry[] = [];

  // Only parse the <head> section for efficiency
  const headEnd = html.indexOf('</head>');
  const head = headEnd > -1 ? html.slice(0, headEnd + 7) : html.slice(0, 200_000);

  // Title
  const titleMatch = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1].trim().replace(/\s+/g, ' ')) : '';
  if (title) {
    entries.push({ key: 'title', content: title, attr: 'title' });
  }

  // Meta tags
  for (const m of head.matchAll(/<meta\s+([\s\S]*?)(?:\s*\/)?>/gi)) {
    const attrs = parseAttrs(m[1]);
    const content = attrs['content'];
    if (content === undefined) continue;
    const decoded = decodeEntities(content);

    if (attrs['property']) {
      entries.push({ key: attrs['property'], content: decoded, attr: 'property' });
    } else if (attrs['name']) {
      entries.push({ key: attrs['name'], content: decoded, attr: 'name' });
    } else if (attrs['http-equiv']) {
      entries.push({ key: attrs['http-equiv'], content: decoded, attr: 'http-equiv' });
    }
  }

  // Link tags (canonical, icon, manifest, etc.)
  for (const m of head.matchAll(/<link\s+([\s\S]*?)(?:\s*\/)?>/gi)) {
    const attrs = parseAttrs(m[1]);
    if (attrs['rel'] && attrs['href']) {
      entries.push({ key: `link:${attrs['rel']}`, content: attrs['href'], attr: 'rel' });
    }
  }

  return { title, entries };
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('url');
  if (!raw) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const res = await fetchUrl(url);

    if (!res.ok) {
      return NextResponse.json(
        { error: `HTTP ${res.status}: ${res.statusText}` },
        { status: 400 },
      );
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return NextResponse.json(
        { error: `Not an HTML page (Content-Type: ${contentType})` },
        { status: 400 },
      );
    }

    const html = await res.text();
    const { title, entries } = extract(html);

    const result: MetaResult = { url: raw, finalUrl: res.url, title, entries };
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to fetch: ${msg}` }, { status: 500 });
  }
}
