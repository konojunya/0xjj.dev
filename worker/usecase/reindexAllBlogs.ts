import type { Context } from "hono";
import { requireAdminKey } from "../util/admin";
import { indexBlogBySlug } from "../indexer";

function isBlogMarkdownKey(key: string) {
  return key.startsWith("blog/") && key.endsWith(".md") && !key.endsWith("/.md");
}

function slugFromKey(key: string) {
  // blog/foo.md -> foo
  return key.replace(/^blog\//, "").replace(/\.md$/, "");
}

export async function reindexAllBlogs(c: Context<{ Bindings: Env }>) {
  const unauthorized = requireAdminKey(c);
  if (unauthorized) return unauthorized;

  const url = new URL(c.req.url);
  const limit = Number(url.searchParams.get("limit") ?? "50");
  const dryRun = url.searchParams.get("dryRun") === "1";

  const slugs: string[] = [];

  let cursor: string | undefined = undefined;
  while (slugs.length < limit) {
    const res = await c.env.ASSETS.list({
      prefix: "blog/",
      cursor,
    });

    for (const obj of res.objects) {
      const key = obj.key;
      if (!isBlogMarkdownKey(key)) continue;
      slugs.push(slugFromKey(key));
      if (slugs.length >= limit) break;
    }

    if (!res.truncated) break;
    cursor = res.cursor;
    if (!cursor) break;
  }

  console.log(`Found ${slugs.length} blog markdown keys`);

  const uniqueSlugs = [...new Set(slugs)];

  if (dryRun) {
    return c.json({
      ok: true,
      dryRun: true,
      count: uniqueSlugs.length,
      slugs: uniqueSlugs,
    });
  }

  const results: Array<{ slug: string; ok: boolean; chunks?: number; error?: string }> = [];

  for (const slug of uniqueSlugs) {
    try {
      const r = await indexBlogBySlug(c.env, slug);
      results.push({ slug, ok: true, chunks: r.chunks });
    } catch (e: any) {
      results.push({ slug, ok: false, error: e?.message ?? String(e) });
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  return c.json({
    ok: true,
    processed: results.length,
    succeeded: okCount,
    failed: results.length - okCount,
    results,
  });
}