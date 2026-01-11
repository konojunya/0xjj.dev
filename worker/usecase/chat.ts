import type { Context } from "hono";
import { getClientIp } from "../util/ip";
import { checkRateLimit } from "./rateLimit";
import { createWorkersAI } from "workers-ai-provider";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

export async function chat(c: Context<{ Bindings: Env }>) {
  const ip = getClientIp(c);
  const rl = await checkRateLimit(c.env, ip);
  if (!rl.ok) {
    return c.json(
      {
        error: "rate_limit_exceeded",
        message: "Too many requests. Please try again later.",
        retryAfterSeconds: rl.retryAfter,
      },
      429,
      { "Retry-After": rl.retryAfter.toString() },
    );
  }

  const { messages } = (await c.req.json()) as { messages: UIMessage[] };
  const workersAI = createWorkersAI({ binding: c.env.AI });

  const result = streamText({
    model: workersAI("@cf/meta/llama-3.2-1b-instruct"),
    messages: await convertToModelMessages(messages),
    system: [
      "あなたは JJ のサイトに関する質問に回答するアシスタントです",
      "回答は Markdown で行ってください。",
      "簡潔かつ明確に回答してください。",
    ].join("\n"),
  });

  const res = result.toUIMessageStreamResponse({
    headers: { "content-encoding": "identity" },
  });

  return res;
}
