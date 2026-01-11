import { chunkMarkdown } from "../chunk";
import { embedInBatches } from "../embed";
import { getBlog } from "../util/r2";

export async function indexBlogBySlug(env: Env, slug: string) {
  const md = await getBlog(env, slug);
  if (!md) {
    return {
      error: `Blog not found: ${slug}`,
      status: 404
    }
  }

  const chunks = chunkMarkdown(md);
  if (chunks.length === 0) {
    return {
      error: `Blog is empty: ${slug}`,
      status: 400
    }
  }

  const vectors = await embedInBatches(env, chunks);

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

  console.log(`Indexing blog ${slug} with ${records.length} records`);
  await env.BLOG_INDEX.upsert(records);

  return {
    error: null,
    status: 200,
    chunks: chunks.length,
    upserted: records.length,
  }
}