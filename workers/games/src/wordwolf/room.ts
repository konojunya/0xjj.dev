import { DurableObject } from "cloudflare:workers";
import {
  addPlayer, allVotesIn, castVote, connectedCount, createInitialState,
  disconnectPlayer, getVoteCounts, getWordForPlayer, removePlayer,
  returnToLobby, startGame, tallyVotes, transitionToVoting, wolfGuess,
} from "./logic";
import type { ClientMessage, GameState, ServerMessage } from "./types";

export class WordWolfRoom extends DurableObject {
  private state: GameState;
  private initialized = false;

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    this.state = createInitialState();
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  private async ensureState(): Promise<void> {
    if (this.initialized) return;
    const stored = await this.ctx.storage.get<GameState>("state");
    if (stored) this.state = stored;
    this.initialized = true;
  }

  private async saveState(): Promise<void> {
    await this.ctx.storage.put("state", this.state);
  }

  async fetch(request: Request): Promise<Response> {
    await this.ensureState();
    const url = new URL(request.url);
    if (url.pathname !== "/ws") return new Response("Not found", { status: 404 });
    if (request.headers.get("Upgrade") !== "websocket") return new Response("Expected WebSocket", { status: 426 });

    const playerId = crypto.randomUUID().slice(0, 8);
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1], [playerId]);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(ws: WebSocket, rawMessage: string | ArrayBuffer): Promise<void> {
    if (typeof rawMessage !== "string") return;
    await this.ensureState();

    let msg: ClientMessage;
    try { msg = JSON.parse(rawMessage); } catch { this.send(ws, { type: "error", message: "Invalid JSON" }); return; }

    const playerId = this.ctx.getTags(ws)[0];

    switch (msg.type) {
      case "join": {
        const name = msg.name?.trim();
        if (!name) { this.send(ws, { type: "error", message: "Name is required" }); return; }
        if (this.state.phase !== "lobby") { this.send(ws, { type: "error", message: "Game is already in progress" }); return; }
        const newState = addPlayer(this.state, playerId, name);
        if (!newState) { this.send(ws, { type: "error", message: "Room is full" }); return; }
        this.state = newState;
        await this.saveState();
        this.send(ws, { type: "joined", playerId, players: this.state.players, isHost: this.state.hostId === playerId, hostId: this.state.hostId! });
        this.broadcastExcept(playerId, { type: "player_joined", players: this.state.players, hostId: this.state.hostId! });
        break;
      }
      case "start": {
        const newState = startGame(this.state, playerId);
        if (!newState) { this.send(ws, { type: "error", message: "Cannot start game" }); return; }
        this.state = newState;
        if (this.state.discussionEndTime) await this.ctx.storage.setAlarm(this.state.discussionEndTime);
        await this.saveState();
        for (const [pid, player] of Object.entries(this.state.players)) {
          const playerWs = this.getWs(pid);
          if (playerWs && player.connected) {
            this.send(playerWs, { type: "game_started", word: getWordForPlayer(this.state, pid)!, phase: "playing", endTime: this.state.discussionEndTime!, players: this.state.players });
          }
        }
        break;
      }
      case "vote": {
        const newState = castVote(this.state, playerId, msg.targetId);
        if (!newState) { this.send(ws, { type: "error", message: "Invalid vote" }); return; }
        this.state = newState;
        await this.saveState();
        this.broadcast({ type: "vote_update", voteCount: getVoteCounts(this.state) });
        if (allVotesIn(this.state)) await this.resolveVotes();
        break;
      }
      case "guess": {
        if (playerId !== this.state.wolfId) { this.send(ws, { type: "error", message: "Only the wolf can guess" }); return; }
        const newState = wolfGuess(this.state, msg.word);
        if (!newState) { this.send(ws, { type: "error", message: "Cannot guess now" }); return; }
        this.state = newState;
        await this.saveState();
        this.broadcast({ type: "guess_result", correct: this.state.winner === "wolf", winner: this.state.winner! });
        break;
      }
      case "play_again": {
        if (playerId !== this.state.hostId) { this.send(ws, { type: "error", message: "Only the host can restart" }); return; }
        if (this.state.phase !== "result") { this.send(ws, { type: "error", message: "Game is not over" }); return; }
        this.state = returnToLobby(this.state);
        await this.saveState();
        this.broadcast({ type: "returned_to_lobby", players: this.state.players, hostId: this.state.hostId! });
        break;
      }
      default: this.send(ws, { type: "error", message: "Unknown message type" });
    }
  }

  async alarm(): Promise<void> {
    await this.ensureState();
    if (this.state.phase === "playing") {
      this.state = transitionToVoting(this.state);
      await this.saveState();
      this.broadcast({ type: "phase_changed", phase: "voting" });
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.ensureState();
    const playerId = this.ctx.getTags(ws)[0];
    if (this.state.phase === "lobby") this.state = removePlayer(this.state, playerId);
    else this.state = disconnectPlayer(this.state, playerId);

    if ((this.state.phase === "playing" || this.state.phase === "voting") && connectedCount(this.state) < 3) {
      this.state = returnToLobby(this.state);
      await this.saveState();
      this.broadcast({ type: "returned_to_lobby", players: this.state.players, hostId: this.state.hostId ?? "" });
      return;
    }

    if (Object.keys(this.state.players).length > 0 && this.state.hostId) {
      this.broadcast({ type: "player_left", players: this.state.players, hostId: this.state.hostId });
      if (this.state.phase === "voting" && allVotesIn(this.state)) await this.resolveVotes();
    }

    if (Object.values(this.state.players).every((p) => !p.connected)) this.state = createInitialState();
    await this.saveState();
  }

  async webSocketError(ws: WebSocket): Promise<void> { await this.webSocketClose(ws); }

  private async resolveVotes(): Promise<void> {
    this.state = tallyVotes(this.state);
    await this.saveState();
    this.broadcast({ type: "result", wolfId: this.state.wolfId!, wolfWord: this.state.wolfWord!, citizenWord: this.state.citizenWord!, votes: this.state.votes, winner: this.state.winner!, canGuess: this.state.winner === "citizen" && !this.state.wolfGuessed });
  }

  private getWs(tag: string): WebSocket | null { const s = this.ctx.getWebSockets(tag); return s.length > 0 ? s[0] : null; }
  private send(ws: WebSocket, msg: ServerMessage): void { try { ws.send(JSON.stringify(msg)); } catch {} }
  private broadcast(msg: ServerMessage): void { for (const ws of this.ctx.getWebSockets()) this.send(ws, msg); }
  private broadcastExcept(excludeTag: string, msg: ServerMessage): void {
    for (const ws of this.ctx.getWebSockets()) { if (this.ctx.getTags(ws)[0] !== excludeTag) this.send(ws, msg); }
  }
}
