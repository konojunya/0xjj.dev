export type Mark = "B" | "W"; // Black / White
export type Cell = 0 | 1 | 2; // 0=empty, 1=Black, 2=White

export interface GameState {
  board: Cell[][]; // 8x8
  turn: Mark;
  status: "waiting" | "playing" | "ended";
  winner: Mark | "draw" | null;
  scores: { B: number; W: number };
  validMoves: [number, number][];
  players: { B: { connected: boolean } | null; W: { connected: boolean } | null };
  rematchRequested: { B: boolean; W: boolean };
}

export type ClientMessage = { type: "place"; row: number; col: number } | { type: "rematch" };

export type ServerMessage =
  | { type: "joined"; playerId: Mark; state: GameState }
  | { type: "state"; state: GameState }
  | { type: "error"; message: string }
  | { type: "opponent_connected" }
  | { type: "opponent_disconnected" };
