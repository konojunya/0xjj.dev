import { DurableObject } from "cloudflare:workers";

export class IpRateLimiter extends DurableObject {
  private state: DurableObjectState;
  public constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.state = state;
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    if (url.pathname !== "/check") {
      return new Response("Not Found", { status: 404 });
    }
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const { windowSec, limit } = await request.json<{ windowSec: number; limit: number }>().catch(() => ({
      windowSec: 60,
      limit: 10,
    }));

    const wSec = Number(windowSec) > 0 ? Number(windowSec) : 60;
    const max = Number(limit) > 0 ? Number(limit) : 10;

    const now = Date.now();
    const windowMs = wSec * 1000;
    const bucket = Math.floor(now / windowMs);
    const key = `b:${bucket}`;

    const count = await this.state.storage.transaction(async (tx) => {
      const current = (await tx.get<number>(key)) ?? 0;
      const next = current + 1;
      await tx.put(key, next);

      return next;
    });

    if (count > max) {
      const retryAfter = Math.max(
        1,
        Math.ceil(((bucket + 1) * windowMs - now) / 1000),
      );
      return new Response(JSON.stringify({ ok: false, retryAfter }), {
        status: 429,
        headers: {
          "content-type": "application/json",
          "Retry-After": String(retryAfter),
        },
      });
    }

    return new Response(JSON.stringify({ ok: true, remaining: max - count }), {
      headers: { "content-type": "application/json" },
    });
  }
}
