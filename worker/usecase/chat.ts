import type { Context } from "hono";
import { sseData, sseHeaders } from "../util/streaming";

export function chat(c: Context<{ Bindings: Env }>) {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();

      const chunks = [
        `# Hello from Hono on Workers 👋`,
        ``,
        `これは **Markdown** を **SSE streaming** で返す最小実装です。`,
        ``,
        `- 次はここを LLM のストリームに差し替えます`,
        `- 次に DO で IP rate limit を入れます`,
        ``,
        `> time: ${new Date().toISOString()}`,
      ];

      for (const chunk of chunks) {
        controller.enqueue(enc.encode(sseData(chunk)));
        await new Promise((r) => setTimeout(r, 200)); // SSE streaming
      }

      controller.enqueue(enc.encode(`event: done\ndata: {}\n\n`));
      controller.close();
    },
  });

  return c.newResponse(stream, {
    headers: sseHeaders(),
  });
}
