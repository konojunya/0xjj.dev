interface Env {
  ASSETS: Fetcher;
  BLOG_VIEWS: KVNamespace;
}

interface TopPost {
  slug: string;
  views: number;
}

const TOP_KEY = '_top';
const TOP_COUNT = 3;

async function incrementView(kv: KVNamespace, slug: string): Promise<void> {
  const current = Number((await kv.get(slug)) ?? 0);
  const next = current + 1;
  await kv.put(slug, String(next));

  const raw = await kv.get(TOP_KEY);
  const top: TopPost[] = raw ? JSON.parse(raw) : [];

  const idx = top.findIndex((t) => t.slug === slug);
  if (idx >= 0) {
    top[idx].views = next;
  } else {
    top.push({ slug, views: next });
  }

  top.sort((a, b) => b.views - a.views);
  await kv.put(TOP_KEY, JSON.stringify(top.slice(0, TOP_COUNT)));
}

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // POST /api/views/:slug — increment view count
    if (request.method === 'POST') {
      const match = path.match(/^\/api\/views\/(.+)$/);
      if (!match) return new Response('Not Found', { status: 404 });
      const slug = decodeURIComponent(match[1]);
      ctx.waitUntil(incrementView(env.BLOG_VIEWS, slug));
      return new Response(JSON.stringify({ ok: true }), { status: 202, headers });
    }

    // GET /api/views/top — get top 3 posts
    if (request.method === 'GET' && path === '/api/views/top') {
      const raw = await env.BLOG_VIEWS.get(TOP_KEY);
      const top: TopPost[] = raw ? JSON.parse(raw) : [];
      return new Response(JSON.stringify(top), { headers });
    }

    // GET /api/views/:slug — get single post view count
    if (request.method === 'GET') {
      const match = path.match(/^\/api\/views\/(.+)$/);
      if (!match) return new Response('Not Found', { status: 404 });
      const slug = decodeURIComponent(match[1]);
      const views = Number((await env.BLOG_VIEWS.get(slug)) ?? 0);
      return new Response(JSON.stringify({ views }), { headers });
    }

    return new Response('Method Not Allowed', { status: 405 });
  },
} satisfies ExportedHandler<Env>;
