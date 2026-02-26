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

export type ClientMessage =
  | { type: "join" }
  | { type: "move"; index: number }
  | { type: "rematch" };

export type ServerMessage =
  | { type: "joined"; playerId: Mark; sessionId: string; state: GameState }
  | { type: "state"; state: GameState }
  | { type: "error"; message: string }
  | { type: "opponent_connected" }
  | { type: "opponent_disconnected" };
