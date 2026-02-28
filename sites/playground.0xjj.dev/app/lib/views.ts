import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface TopTool {
  slug: string;
  views: number;
}

const TOP_KEY = '_top';
const TOP_COUNT = 3;

export function trackView(slug: string): void {
  const work = (async () => {
    const { env, ctx } = await getCloudflareContext();
    const kv = (env as Record<string, unknown>).VIEWS as KVNamespace | undefined;
    if (!kv) return;

    const task = (async () => {
      const current = Number((await kv.get(slug)) ?? 0);
      const next = current + 1;
      await kv.put(slug, String(next));

      const raw = await kv.get(TOP_KEY);
      const top: TopTool[] = raw ? JSON.parse(raw) : [];

      const idx = top.findIndex((t) => t.slug === slug);
      if (idx >= 0) {
        top[idx].views = next;
      } else {
        top.push({ slug, views: next });
      }

      top.sort((a, b) => b.views - a.views);
      await kv.put(TOP_KEY, JSON.stringify(top.slice(0, TOP_COUNT)));
    })();

    ctx.waitUntil(task);
  })();

  work.catch(() => {});
}

export async function getTopTools(): Promise<TopTool[]> {
  try {
    const { env } = await getCloudflareContext();
    const kv = (env as Record<string, unknown>).VIEWS as KVNamespace | undefined;
    if (!kv) return [];

    const raw = await kv.get(TOP_KEY);
    if (!raw) return [];

    return JSON.parse(raw) as TopTool[];
  } catch {
    return [];
  }
}
