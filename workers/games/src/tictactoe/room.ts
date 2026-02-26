import { DurableObject } from "cloudflare:workers";
import { applyMove, createInitialState, resetForRematch } from "./logic";
import type { ClientMessage, GameState, Mark, ServerMessage } from "./types";

export class TicTacToeRoom extends DurableObject {
  private state: GameState;

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    this.state = createInitialState();
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/ws") return new Response("Not found", { status: 404 });
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    let mark: Mark;
    if (!this.state.players.X) mark = "X";
    else if (!this.state.players.O) mark = "O";
    else return new Response("Room is full", { status: 409 });

    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1], [mark]);
    this.state.players[mark] = { connected: true };

    if (this.state.players.X && this.state.players.O && this.state.status === "waiting") {
      this.state.status = "playing";
    }

    this.send(pair[1], { type: "joined", playerId: mark, state: this.state });

    const opponentMark: Mark = mark === "X" ? "O" : "X";
    const opponentWs = this.getWs(opponentMark);
    if (opponentWs) {
      this.send(opponentWs, { type: "opponent_connected" });
      this.send(opponentWs, { type: "state", state: this.state });
    }

    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(ws: WebSocket, rawMessage: string | ArrayBuffer): Promise<void> {
    if (typeof rawMessage !== "string") return;
    let msg: ClientMessage;
    try { msg = JSON.parse(rawMessage); } catch { this.send(ws, { type: "error", message: "Invalid JSON" }); return; }

    const mark = this.ctx.getTags(ws)[0] as Mark;

    switch (msg.type) {
      case "move": {
        const prev = this.state;
        this.state = applyMove(this.state, msg.index, mark);
        if (this.state !== prev) this.broadcastState();
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
        this.broadcastState();
        break;
      }
      default: this.send(ws, { type: "error", message: "Unknown message type" });
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const mark = this.ctx.getTags(ws)[0] as Mark;
    if (this.state.players[mark]) this.state.players[mark] = null;

    const opp = this.getWs(mark === "X" ? "O" : "X");
    if (opp) {
      this.send(opp, { type: "opponent_disconnected" });
      this.send(opp, { type: "state", state: this.state });
    }

    if (!this.state.players.X && !this.state.players.O) this.state = createInitialState();
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
