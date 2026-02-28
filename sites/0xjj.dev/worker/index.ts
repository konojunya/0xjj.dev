interface Env {
  ASSETS: Fetcher;
  AE_BLOG: AnalyticsEngineDataset;
  CF_ACCOUNT_ID: string;
  CF_AE_TOKEN: string;
}

const AE_DATASET = 'blog_views';
const TOP_COUNT = 3;

function aeUrl(accountId: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`;
}

async function aeQuery(accountId: string, token: string, sql: string): Promise<unknown[] | null> {
  if (!accountId || !token) {
    console.error('[aeQuery] missing credentials', { hasAccountId: !!accountId, hasToken: !!token });
    return null;
  }
  const res = await fetch(aeUrl(accountId), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body: sql,
  });
  const text = await res.text();
  if (!res.ok) {
    console.error('[aeQuery] API error', { status: res.status, body: text, sql });
    return null;
  }
  try {
    const json = JSON.parse(text) as { data?: unknown[] };
    console.log('[aeQuery] success', { rows: json.data?.length ?? 0 });
    return json.data ?? null;
  } catch {
    console.error('[aeQuery] failed to parse response', { text: text.slice(0, 500) });
    return null;
  }
}

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // POST /api/views/:slug — increment view count
    if (request.method === 'POST') {
      const match = path.match(/^\/api\/views\/(.+)$/);
      if (!match) return new Response('Not Found', { status: 404 });
      const slug = decodeURIComponent(match[1]);
      if (env.AE_BLOG) {
        env.AE_BLOG.writeDataPoint({ blobs: [slug], doubles: [1], indexes: [slug] });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 202, headers });
    }

    // GET /api/views/top — get top 3 posts
    if (request.method === 'GET' && path === '/api/views/top') {
      const sql = `SELECT blob1 AS slug, SUM(double1) AS views FROM ${AE_DATASET} GROUP BY blob1 ORDER BY views DESC LIMIT ${TOP_COUNT}`;
      const rows = await aeQuery(env.CF_ACCOUNT_ID, env.CF_AE_TOKEN, sql);
      if (!rows) return new Response(JSON.stringify([]), { headers });
      const top = (rows as Array<{ slug: string; views: number }>)
        .map(r => ({ slug: r.slug, views: Number(r.views) }));
      return new Response(JSON.stringify(top), { headers });
    }

    // GET /api/views/:slug — get single post view count
    if (request.method === 'GET') {
      const match = path.match(/^\/api\/views\/(.+)$/);
      if (!match) return new Response('Not Found', { status: 404 });
      const slug = decodeURIComponent(match[1]).replace(/'/g, "''");
      const sql = `SELECT SUM(double1) AS views FROM ${AE_DATASET} WHERE blob1 = '${slug}'`;
      const rows = await aeQuery(env.CF_ACCOUNT_ID, env.CF_AE_TOKEN, sql);
      const views = rows?.length ? Number((rows[0] as { views: number }).views) : 0;
      return new Response(JSON.stringify({ views }), { headers });
    }

    return new Response('Method Not Allowed', { status: 405 });
  },
} satisfies ExportedHandler<Env>;
