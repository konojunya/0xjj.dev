import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import fs from "node:fs";
import { join } from "node:path";

export async function compileMarkdown(md: string) {
  const file = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(md);

  return String(file);
}

export function loadPublicMarkdown(path: string) {
  return fs.readFileSync(join(process.cwd(), "/public", path)).toString();
}
