import { DurableObject } from "cloudflare:workers";
import { applyMove, createInitialState, resetForRematch } from "./logic";
import type { ClientMessage, GameState, Mark, ServerMessage } from "./types";

const RECONNECT_TIMEOUT = 60_000;

export class TicTacToeRoom extends DurableObject {
  private state: GameState;
  private initialized = false;
  private playerIds: Partial<Record<Mark, string>> = {};

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    this.state = createInitialState();
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  private async ensureState(): Promise<void> {
    if (this.initialized) return;
    const stored = await this.ctx.storage.get<GameState>("state");
    if (stored) this.state = stored;
    const ids = await this.ctx.storage.get<Partial<Record<Mark, string>>>("playerIds");
    if (ids) this.playerIds = ids;
    this.initialized = true;
  }

  private async saveState(): Promise<void> {
    await this.ctx.storage.put("state", this.state);
    await this.ctx.storage.put("playerIds", this.playerIds);
  }

  async fetch(request: Request): Promise<Response> {
    await this.ensureState();
    const url = new URL(request.url);
    if (url.pathname !== "/ws") return new Response("Not found", { status: 404 });
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const incomingId = url.searchParams.get("playerId");
    let mark: Mark | null = null;
    let isReconnect = false;

    // Check for reconnection
    if (incomingId) {
      for (const m of ["X", "O"] as Mark[]) {
        if (this.playerIds[m] === incomingId && this.state.players[m] && !this.state.players[m]!.connected) {
          mark = m;
          isReconnect = true;
          break;
        }
      }
    }

    // New player - find empty slot (null only, not disconnected)
    if (!mark) {
      if (!this.state.players.X) mark = "X";
      else if (!this.state.players.O) mark = "O";
      else return new Response("Room is full", { status: 409 });
    }

    const sessionId = isReconnect ? incomingId! : crypto.randomUUID().slice(0, 8);
    if (!isReconnect) this.playerIds[mark] = sessionId;

    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1], [mark]);
    this.state.players[mark] = { connected: true };

    if (this.state.players.X?.connected && this.state.players.O?.connected && this.state.status === "waiting") {
      this.state.status = "playing";
    }

    await this.saveState();

    this.send(pair[1], { type: "joined", playerId: mark, sessionId, state: this.state });

    const oppMark: Mark = mark === "X" ? "O" : "X";
    const oppWs = this.getWs(oppMark);
    if (oppWs) {
      this.send(oppWs, { type: "opponent_connected" });
      this.send(oppWs, { type: "state", state: this.state });
    }

    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(ws: WebSocket, rawMessage: string | ArrayBuffer): Promise<void> {
    if (typeof rawMessage !== "string") return;
    await this.ensureState();
    let msg: ClientMessage;
    try { msg = JSON.parse(rawMessage); } catch { this.send(ws, { type: "error", message: "Invalid JSON" }); return; }

    const mark = this.ctx.getTags(ws)[0] as Mark;

    switch (msg.type) {
      case "move": {
        const prev = this.state;
        this.state = applyMove(this.state, msg.index, mark);
        if (this.state !== prev) { await this.saveState(); this.broadcastState(); }
        else this.send(ws, { type: "error", message: "Invalid move" });
        break;
      }
      case "rematch": {
        if (this.state.status !== "won" && this.state.status !== "draw") {
          this.send(ws, { type: "error", message: "Game is not over" }); return;
        }
        this.state.rematchRequested[mark] = true;
        if (this.state.rematchRequested.X && this.state.rematchRequested.O) {
          this.state = resetForRematch(this.state);
        }
        await this.saveState();
        this.broadcastState();
        break;
      }
      default: this.send(ws, { type: "error", message: "Unknown message type" });
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.ensureState();
    const mark = this.ctx.getTags(ws)[0] as Mark;
    if (this.state.players[mark]) {
      this.state.players[mark] = { connected: false };
    }
    await this.saveState();

    const opp = this.getWs(mark === "X" ? "O" : "X");
    if (opp) {
      this.send(opp, { type: "opponent_disconnected" });
      this.send(opp, { type: "state", state: this.state });
    }

    await this.ctx.storage.setAlarm(Date.now() + RECONNECT_TIMEOUT);
  }

  async alarm(): Promise<void> {
    await this.ensureState();
    let changed = false;
    for (const m of ["X", "O"] as Mark[]) {
      if (this.state.players[m] && !this.state.players[m]!.connected && !this.getWs(m)) {
        this.state.players[m] = null;
        delete this.playerIds[m];
        changed = true;
      }
    }
    if (changed) {
      if (!this.state.players.X && !this.state.players.O) {
        this.state = createInitialState();
        this.playerIds = {};
      }
      await this.saveState();
      this.broadcastState();
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> { await this.webSocketClose(ws); }

  private getWs(tag: string): WebSocket | null {
    const s = this.ctx.getWebSockets(tag);
    return s.length > 0 ? s[0] : null;
  }
  private send(ws: WebSocket, msg: ServerMessage): void {
    try { ws.send(JSON.stringify(msg)); } catch {}
  }
  private broadcastState(): void {
    for (const ws of this.ctx.getWebSockets()) this.send(ws, { type: "state", state: this.state });
  }
}
