export type Mark = "A" | "B";

export interface GameState {
  // 5x5 dots → 4x4 boxes
  hLines: boolean[][]; // 5 rows × 4 cols (horizontal lines)
  vLines: boolean[][]; // 4 rows × 5 cols (vertical lines)
  boxes: number[][];   // 4 rows × 4 cols, 0=unclaimed, 1=A, 2=B
  turn: Mark;
  status: "waiting" | "playing" | "ended";
  scores: { A: number; B: number };
  winner: Mark | "draw" | null;
  players: { A: { connected: boolean } | null; B: { connected: boolean } | null };
  rematchRequested: { A: boolean; B: boolean };
  lastLine: { type: "h" | "v"; row: number; col: number } | null;
}

export type ClientMessage =
  | { type: "line"; lineType: "h" | "v"; row: number; col: number }
  | { type: "rematch" };

export type ServerMessage =
  | { type: "joined"; playerId: Mark; state: GameState }
  | { type: "state"; state: GameState }
  | { type: "error"; message: string }
  | { type: "opponent_connected" }
  | { type: "opponent_disconnected" };
