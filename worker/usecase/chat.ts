import type { Context } from "hono";
import { getClientIp } from "../util/ip";
import { checkRateLimit } from "./rateLimit";
import { createWorkersAI } from "workers-ai-provider";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { buildContextFromMatches, searchRelevantChunks } from "./rag";

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

  const userText =
    messages
      .slice()
      .reverse()
      .find((m) => m.role === "user")
      ?.parts.join("") || "";
  console.log({ userText });
  const matches = await searchRelevantChunks(c.env, userText);
  const context = await buildContextFromMatches(c.env, matches);

  const result = streamText({
    model: workersAI("@cf/meta/llama-3.1-8b-instruct-fp8"),
    messages: await convertToModelMessages(messages),
    system: [
      "あなたは JJ のサイトに関する質問に回答するアシスタントです",
      "回答は Markdown で行ってください。",
      "与えられた Context に基づいて答えてください。分からない場合は分からないと言ってください。",
      "言語は常に「日本語」で答えるようにしてください。",
      "回答は簡潔にし、長くても500文字以内にしてください。",
      "",
      "### Context",
      context || "(no context provided)",
    ].join("\n"),
  });

  const res = result.toUIMessageStreamResponse({
    headers: { "content-encoding": "identity" },
  });

  return res;
}
