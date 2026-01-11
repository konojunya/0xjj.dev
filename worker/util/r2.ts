export async function getBlog(env: Env, slug: string) {
  const key = `blog/${slug}.md`;
  const asset = await env.ASSETS.get(key);
  if (!asset) return null;
  return await asset.text();
}
