import { streamText } from "ai";
import type {
  LanguageModelV2,
  LanguageModelV2StreamPart,
} from "@ai-sdk/provider";

export async function sendMessage(
  message: string,
  onChunk: (chunk: string) => void,
  opts?: { signal?: AbortSignal },
) {
  const model: LanguageModelV2 = {
    specificationVersion: "v2",
    provider: "custom",
    modelId: "cloudflare-llama",
    supportedUrls: {},
    doGenerate: async () => {
      throw new Error("Not implemented");
    },
    doStream: async () => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message }),
        signal: opts?.signal,
      });

      if (!res.body) {
        throw new Error("Response body is null");
      }

      // SSEストリームをLanguageModelV2StreamPartに変換
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const textId = "text-1";
      let hasStarted = false;

      const stream = new ReadableStream<LanguageModelV2StreamPart>({
        async pull(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                if (hasStarted) {
                  controller.enqueue({
                    type: "text-end",
                    id: textId,
                  });
                }
                controller.close();
                break;
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const data = line.slice(6).trim();
                  if (data && data !== "[DONE]") {
                    if (!hasStarted) {
                      controller.enqueue({
                        type: "text-start",
                        id: textId,
                      });
                      hasStarted = true;
                    }
                    // Cloudflare Workers AIのストリーム形式に応じて処理
                    // テキストチャンクをtext-deltaとして返す
                    controller.enqueue({
                      type: "text-delta",
                      id: textId,
                      delta: data,
                    });
                  }
                }
              }
            }
          } catch (error) {
            controller.error(error);
          }
        },
        cancel() {
          reader.cancel();
        },
      });

      return { stream };
    },
  };

  const result = streamText({
    model,
    prompt: message,
  });

  for await (const chunk of result.textStream) {
    onChunk(chunk);
  }
}
