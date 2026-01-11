import type { Context } from "hono";
import { requireAdminKey } from "../util/admin";
import { getBlog } from "../util/r2";
import { chunkMarkdown } from "../chunk";
import { embedInBatches } from "../embed";

export async function upsertBlogIndex(c: Context<{ Bindings: Env }>) {
  const unauthorized = requireAdminKey(c);
  if (unauthorized) return unauthorized;

  const slug = c.req.param("slug");
  if (!slug || slug.includes("/") || slug.includes("..")) {
    return c.json({ error: "invalid_slug" }, 400);
  }

  const md = await getBlog(c.env, slug);
  if (!md) {
    return c.json({ error: "blog_not_found", key: `blog/${slug}.md` }, 404);
  }

  const chunks = chunkMarkdown(md);
  if (chunks.length === 0) {
    return c.json({ error: "blog_is_empty", key: `blog/${slug}.md` }, 400);
  }

  const vectors = await embedInBatches(c.env, chunks);

  const records = vectors.map((values, i) => ({
    id: `${slug}::${i}`,
    values,
    metadata: {
      slug,
      chunk: i,
      heading: chunks[i].heading,
      headingPath: chunks[i].headingPath,
    },
  }));

  await c.env.BLOG_INDEX.upsert(records);

  return c.json({
    ok: true,
    slug,
    key: `blog/${slug}.md`,
    chunks: chunks.length,
    upserted: records.length,
  });
}
