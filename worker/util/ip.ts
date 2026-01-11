import type { Context } from "hono";

export function getClientIp(c: Context<{ Bindings: Env }>) {
  const cfip = c.req.header("CF-Connecting-IP");
  if (cfip) return cfip;

  const xff = c.req.header("X-Forwarded-For");
  if (xff) return xff.split(",")[0].trim();

  return "0.0.0.0";
}
