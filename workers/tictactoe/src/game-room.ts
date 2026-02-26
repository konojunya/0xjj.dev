import { DurableObject } from "cloudflare:workers";
import { applyMove, createInitialState, resetForRematch } from "./game-logic";
import type { ClientMessage, GameState, Mark, ServerMessage } from "./types";

export class TicTacToeRoom extends DurableObject {
  private state: GameState;

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    this.state = createInitialState();

    // Auto-respond to ping with pong for keepalive
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong"),
    );
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected WebSocket", { status: 426 });
      }

      // Determine player mark
      let mark: Mark;
      if (!this.state.players.X) {
        mark = "X";
      } else if (!this.state.players.O) {
        mark = "O";
      } else {
        return new Response("Room is full", { status: 409 });
      }

      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];

      // Accept with hibernation, tag with player mark
      this.ctx.acceptWebSocket(server, [mark]);

      // Update player state
      this.state.players[mark] = { connected: true };

      if (this.state.players.X && this.state.players.O && this.state.status === "waiting") {
        this.state.status = "playing";
      }

      // Send joined message
      this.send(server, { type: "joined", playerId: mark, state: this.state });

      // Notify opponent
      const opponentMark: Mark = mark === "X" ? "O" : "X";
      const opponentWs = this.getWebSocketByTag(opponentMark);
      if (opponentWs) {
        this.send(opponentWs, { type: "opponent_connected" });
        this.send(opponentWs, { type: "state", state: this.state });
      }

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("Not found", { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, rawMessage: string | ArrayBuffer): Promise<void> {
    if (typeof rawMessage !== "string") return;

    let msg: ClientMessage;
    try {
      msg = JSON.parse(rawMessage);
    } catch {
      this.send(ws, { type: "error", message: "Invalid JSON" });
      return;
    }

    const tags = this.ctx.getTags(ws);
    const mark = tags[0] as Mark;

    switch (msg.type) {
      case "move": {
        const prevState = this.state;
        this.state = applyMove(this.state, msg.index, mark);
        if (this.state !== prevState) {
          this.broadcastState();
        } else {
          this.send(ws, { type: "error", message: "Invalid move" });
        }
        break;
      }
      case "rematch": {
        if (this.state.status !== "won" && this.state.status !== "draw") {
          this.send(ws, { type: "error", message: "Game is not over" });
          return;
        }
        this.state.rematchRequested[mark] = true;
        if (this.state.rematchRequested.X && this.state.rematchRequested.O) {
          this.state = resetForRematch(this.state);
        }
        this.broadcastState();
        break;
      }
      default:
        this.send(ws, { type: "error", message: "Unknown message type" });
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    const tags = this.ctx.getTags(ws);
    const mark = tags[0] as Mark;

    if (this.state.players[mark]) {
      this.state.players[mark] = null;
    }

    // Notify opponent
    const opponentMark: Mark = mark === "X" ? "O" : "X";
    const opponentWs = this.getWebSocketByTag(opponentMark);
    if (opponentWs) {
      this.send(opponentWs, { type: "opponent_disconnected" });
      this.send(opponentWs, { type: "state", state: this.state });
    }

    // If no players left, reset the room
    if (!this.state.players.X && !this.state.players.O) {
      this.state = createInitialState();
    }
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    await this.webSocketClose(ws, 1006, "error", false);
  }

  private getWebSocketByTag(tag: string): WebSocket | null {
    const sockets = this.ctx.getWebSockets(tag);
    return sockets.length > 0 ? sockets[0] : null;
  }

  private send(ws: WebSocket, msg: ServerMessage): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // Socket may have closed
    }
  }

  private broadcastState(): void {
    for (const ws of this.ctx.getWebSockets()) {
      this.send(ws, { type: "state", state: this.state });
    }
  }
}
