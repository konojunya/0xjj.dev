export { TicTacToeRoom } from "./tictactoe/room";
export { WordWolfRoom } from "./wordwolf/room";
export { ConnectFourRoom } from "./connect-four/room";
export { ReversiRoom } from "./reversi/room";
export { DotsAndBoxesRoom } from "./dots-and-boxes/room";

interface Env {
  TICTACTOE_ROOM: DurableObjectNamespace;
  WORDWOLF_ROOM: DurableObjectNamespace;
  CONNECT_FOUR_ROOM: DurableObjectNamespace;
  REVERSI_ROOM: DurableObjectNamespace;
  DOTS_AND_BOXES_ROOM: DurableObjectNamespace;
}

const GAME_BINDINGS: Record<string, keyof Env> = {
  tictactoe: "TICTACTOE_ROOM",
  wordwolf: "WORDWOLF_ROOM",
  "connect-four": "CONNECT_FOUR_ROOM",
  reversi: "REVERSI_ROOM",
  "dots-and-boxes": "DOTS_AND_BOXES_ROOM",
};

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function corsResponse(body: string | null, init: ResponseInit = {}): Response {
  return new Response(body, {
    ...init,
    headers: { ...CORS_HEADERS, ...init.headers },
  });
}

function generateRoomId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return corsResponse(null, { status: 204 });
    }

    const url = new URL(request.url);

    // Health check
    if ((url.pathname === "/" || url.pathname === "/health") && request.method === "GET") {
      return corsResponse(JSON.stringify({ status: "ok", games: Object.keys(GAME_BINDINGS) }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get game parameter
    const game = url.searchParams.get("game");
    if (!game || !(game in GAME_BINDINGS)) {
      return corsResponse(JSON.stringify({ error: "Invalid or missing game parameter", available: Object.keys(GAME_BINDINGS) }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const bindingKey = GAME_BINDINGS[game];
    const namespace = env[bindingKey];

    // POST /rooms?game=xxx — create room
    if (url.pathname === "/rooms" && request.method === "POST") {
      const roomId = generateRoomId();
      return corsResponse(JSON.stringify({ roomId }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    // GET /ws?game=xxx&room=yyy — WebSocket upgrade → DO
    if (url.pathname === "/ws") {
      const roomId = url.searchParams.get("room");
      if (!roomId) {
        return corsResponse(JSON.stringify({ error: "room parameter required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const id = namespace.idFromName(roomId);
      const stub = namespace.get(id);
      const doUrl = new URL("/ws", request.url);
      const playerId = url.searchParams.get("playerId");
      if (playerId) doUrl.searchParams.set("playerId", playerId);
      return stub.fetch(new Request(doUrl.toString(), request));
    }

    return corsResponse("Not found", { status: 404 });
  },
};
