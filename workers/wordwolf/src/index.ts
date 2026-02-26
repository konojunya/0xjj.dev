import type { Env } from "./types";

export { WordWolfRoom } from "./game-room";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function generateRoomId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function corsResponse(body: string | null, init: ResponseInit = {}): Response {
  return new Response(body, {
    ...init,
    headers: { ...CORS_HEADERS, ...init.headers },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return corsResponse(null, { status: 204 });
    }

    if (url.pathname === "/rooms" && request.method === "POST") {
      const roomId = generateRoomId();
      return corsResponse(JSON.stringify({ roomId }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/ws") {
      const roomId = url.searchParams.get("room");
      if (!roomId) {
        return corsResponse(JSON.stringify({ error: "room parameter required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const id = env.GAME_ROOM.idFromName(roomId);
      const stub = env.GAME_ROOM.get(id);
      return stub.fetch(new Request(new URL("/ws", request.url).toString(), request));
    }

    if (url.pathname === "/" || url.pathname === "/health") {
      return corsResponse(JSON.stringify({ status: "ok" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return corsResponse("Not found", { status: 404 });
  },
};
