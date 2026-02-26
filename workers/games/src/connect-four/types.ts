export type Mark = "R" | "Y";
export type Cell = 0 | 1 | 2; // 0=empty, 1=R, 2=Y

export interface GameState {
  board: Cell[][]; // 6 rows x 7 cols
  turn: Mark;
  status: "waiting" | "playing" | "won" | "draw";
  winner: Mark | null;
  winCells: [number, number][] | null;
  players: { R: { connected: boolean } | null; Y: { connected: boolean } | null };
  rematchRequested: { R: boolean; Y: boolean };
}

export type ClientMessage = { type: "drop"; column: number } | { type: "rematch" };

export type ServerMessage =
  | { type: "joined"; playerId: Mark; state: GameState }
  | { type: "state"; state: GameState }
  | { type: "error"; message: string }
  | { type: "opponent_connected" }
  | { type: "opponent_disconnected" };
