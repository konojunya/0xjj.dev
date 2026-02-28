import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface TopTool {
  slug: string;
  views: number;
}

const AE_DATASET = 'tool_views';
const TOP_COUNT = 3;

function aeUrl(accountId: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`;
}

async function aeQuery(accountId: string, token: string, sql: string): Promise<unknown[] | null> {
  if (!accountId || !token) return null;
  const res = await fetch(aeUrl(accountId), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'text/plain' },
    body: sql,
  });
  if (!res.ok) return null;
  const json = await res.json() as { data?: unknown[] };
  return json.data ?? null;
}

export function trackView(slug: string): void {
  (async () => {
    try {
      const { env } = await getCloudflareContext();
      const ae = (env as Record<string, unknown>).AE_VIEWS as AnalyticsEngineDataset | undefined;
      if (!ae) return; // ローカル dev: binding なし → スキップ
      ae.writeDataPoint({ blobs: [slug], doubles: [1], indexes: [slug] });
    } catch {
      // trackView はページレンダリングに影響させない
    }
  })();
}

export async function getTopTools(): Promise<TopTool[]> {
  try {
    const { env } = await getCloudflareContext();
    const e = env as Record<string, unknown>;
    const accountId = e.CF_ACCOUNT_ID as string | undefined;
    const token = e.CF_AE_TOKEN as string | undefined;
    const sql = `SELECT blob1 AS slug, SUM(double1) AS views FROM ${AE_DATASET} GROUP BY blob1 ORDER BY views DESC LIMIT ${TOP_COUNT}`;
    const rows = await aeQuery(accountId ?? '', token ?? '', sql);
    if (!rows) return [];
    return (rows as Array<{ slug: string; views: number }>).map(r => ({
      slug: r.slug,
      views: Number(r.views),
    }));
  } catch {
    return [];
  }
}
