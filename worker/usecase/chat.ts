import type { Context } from "hono";
import { getClientIp } from "../util/ip";
import { checkRateLimit } from "./rateLimit";

const SYSTEM_PROMPT = [
  "You are a helpful assistant for a personal portfolio site.",
  "Return the answer in Markdown.",
  "Keep it concise and clear.",
].join("\n");

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

  const body = await c.req.json().catch(() => ({}));
  const message = typeof body?.message === "string" ? body.message : "";

  const prompt = [
    SYSTEM_PROMPT,
    `User: ${message || "(empty)"}`,
    "Assistant:",
  ].join("\n");

  const stream = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
    prompt,
    stream: true,
  });

  return c.newResponse(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
