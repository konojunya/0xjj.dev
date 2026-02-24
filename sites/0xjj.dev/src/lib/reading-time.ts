/** Estimate reading time from raw markdown body. */
export function readingTime(body: string): number {
  // Strip frontmatter, code blocks, images, HTML tags
  const text = body
    .replace(/^---[\s\S]*?---/, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();

  // Count CJK characters and latin words separately
  const cjk = (text.match(/[\u3000-\u9fff\uac00-\ud7af\uf900-\ufaff]/g) ?? []).length;
  const words = (text.replace(/[\u3000-\u9fff\uac00-\ud7af\uf900-\ufaff]/g, '').match(/\S+/g) ?? []).length;

  // ~600 CJK chars/min, ~200 words/min
  const minutes = cjk / 600 + words / 200;
  return Math.max(1, Math.round(minutes));
}
