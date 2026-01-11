import { chunkMarkdown } from "../chunk";
import { embedText } from "../embed";
import { getBlog } from "../util/r2";

export async function searchRelevantChunks(
  env: Env,
  query: string,
  topK: number = 6,
) {
  const [qVec] = await embedText(env, [query]);
  const res = await env.BLOG_INDEX.query(qVec, {
    topK,
    returnMetadata: true,
    returnValues: false,
  });

  return res.matches ?? [];
}

export async function buildContextFromMatches(
  env: Env,
  matches: VectorizeMatch[],
) {
  const bySlug = new Map<string, number[]>();
  for (const m of matches) {
    const { slug, chunk } = m.metadata as {
      slug: string;
      chunk: number;
      heading: string;
      headingPath: string[];
    };
    if (!slug || chunk == null) continue;
    bySlug.set(slug, [...(bySlug.get(slug) ?? []), chunk]);
  }

  const contexts = [];
  for (const [slug, chunkIds] of bySlug) {
    const md = await getBlog(env, slug);
    if (!md) continue;
    const chunks = chunkMarkdown(md);

    for (const id of [...new Set(chunkIds)].slice(0, 3)) {
      const ch = chunks[id];
      if (!ch) continue;
      const title =
        ch.headingPath?.[ch.headingPath.length - 1] ?? ch.heading ?? "";
      contexts.push(
        [
          `## Source: blog/${slug}.md (chunk ${id})`,
          title ? `> ${title}` : "",
          ch.body,
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }
  }

  return contexts.join("\n\n---\n\n");
}
