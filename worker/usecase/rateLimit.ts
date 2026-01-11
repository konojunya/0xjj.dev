export const RL_WINDOW_SEC = 60;
export const RL_MAX_PER_WINDOW = 2;

export async function checkRateLimit(env: Env, ip: string) {
  const id = env.RATE_LIMITER.idFromName(ip);
  const stub = env.RATE_LIMITER.get(id);

  const res = await stub.fetch("https://rate-limiter/check", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      windowSec: RL_WINDOW_SEC,
      limit: RL_MAX_PER_WINDOW,
    }),
  });

  if (res.ok) return { ok: true as const };

  const retryAfter = Number(res.headers.get("Retry-After") ?? "1");
  return { ok: false as const, retryAfter };
}
