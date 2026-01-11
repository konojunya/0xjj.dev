export interface MarkdownChunk {
  heading: string;
  headingPath: string[];
  body: string;
}

export function chunkMarkdown(
  md: string,
  maxChars: number = 2000,
): MarkdownChunk[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const isHeading = (line: string) => /^#{1,6}\s+/.test(line);
  const levelOf = (line: string) => line.match(/^#{1,6}/)?.[0].length ?? 0;
  const stack: (string | null)[] = Array(6).fill(null);

  const chunks: MarkdownChunk[] = [];

  let currentHeading: string | null = null;
  let currentLevel = 0;
  let buffer: string[] = [];

  const flush = () => {
    if (!currentHeading) return;
    const headingPath = stack.filter(Boolean) as string[];
    const text = buffer.join("\n").trim();
    if (!text) return;

    // 長すぎる場合は、同一見出し配下で分割
    if (text.length <= maxChars) {
      chunks.push({ heading: currentHeading, headingPath, body: text });
    } else {
      // 見出し行は先頭に含まれている想定なので、そのまま分割
      for (let i = 0; i < text.length; i += maxChars) {
        const slice = text.slice(i, i + maxChars);
        if (slice.trim().length === 0) continue;
        chunks.push({
          heading: currentHeading,
          headingPath,
          body: slice,
        });
      }
    }
  };

  for (const line of lines) {
    if (isHeading(line)) {
      // いまのブロックを確定
      flush();

      // 新しい見出しスタート
      currentHeading = line.trim();
      currentLevel = levelOf(line);

      // スタック更新（そのレベル以降は捨てる）
      stack[currentLevel - 1] = currentHeading;
      for (let i = currentLevel; i < 6; i++) stack[i] = null;

      buffer = [currentHeading];
    } else {
      if (!currentHeading) {
        // 先頭に見出しがない文書向け：擬似見出しを作る
        currentHeading = "# (untitled)";
        currentLevel = 1;
        stack[0] = currentHeading;
        for (let i = 1; i < 6; i++) stack[i] = null;
        buffer = [currentHeading, line];
      } else {
        buffer.push(line);
      }
    }
  }

  flush();

  return chunks;
}
