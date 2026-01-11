import type { Context } from "hono";

export function requireAdminKey(
  c: Context<{ Bindings: Env }>,
): Response | null {
  const got = c.req.header("X-Admin-Key") ?? "";
  const expected = c.env.ADMIN_INDEX_KEY ?? "";
  if (!expected || got !== expected) {
    return c.json({ error: "unauthorized" }, 401);
  }
  return null;
}
