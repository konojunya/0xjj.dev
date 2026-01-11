import type { Context } from "hono";
import { requireAdminKey } from "../util/admin";
import { indexBlogBySlug } from "../indexer";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export async function upsertBlogIndex(c: Context<{ Bindings: Env }>) {
  const unauthorized = requireAdminKey(c);
  if (unauthorized) return unauthorized;

  const slug = c.req.param("slug");
  if (!slug || slug.includes("/") || slug.includes("..")) {
    return c.json({ error: "invalid_slug" }, 400);
  }

  const result = await indexBlogBySlug(c.env, slug)
  if(result.error) {
    return c.json({ error: result.error }, result.status as ContentfulStatusCode)
  }


  return c.json({
    ok: true,
    slug,
    key: `blog/${slug}.md`,
    chunks: result.chunks,
    upserted: result.upserted,
  });
}
