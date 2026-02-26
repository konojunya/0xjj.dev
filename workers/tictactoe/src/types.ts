export type Mark = "X" | "O";
export type Cell = Mark | null;

export interface PlayerInfo {
  connected: boolean;
}

export interface GameState {
  board: Cell[];
  turn: Mark;
  status: "waiting" | "playing" | "won" | "draw";
  winner: Mark | null;
  winLine: number[] | null;
  players: {
    X: PlayerInfo | null;
    O: PlayerInfo | null;
  };
  rematchRequested: {
    X: boolean;
    O: boolean;
  };
}

// Client → Server messages
export type ClientMessage =
  | { type: "join" }
  | { type: "move"; index: number }
  | { type: "rematch" };

// Server → Client messages
export type ServerMessage =
  | { type: "joined"; playerId: Mark; state: GameState }
  | { type: "state"; state: GameState }
  | { type: "error"; message: string }
  | { type: "opponent_connected" }
  | { type: "opponent_disconnected" };

export interface Env {
  GAME_ROOM: DurableObjectNamespace;
}
