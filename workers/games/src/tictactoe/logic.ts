import type { Cell, GameState, Mark } from "./types";

const WIN_LINES: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function createInitialState(): GameState {
  return {
    board: Array(9).fill(null) as Cell[],
    turn: "X",
    status: "waiting",
    winner: null,
    winLine: null,
    players: { X: null, O: null },
    rematchRequested: { X: false, O: false },
  };
}

export function checkWinner(board: Cell[]): { winner: Mark; line: number[] } | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a]!, line };
    }
  }
  return null;
}

export function applyMove(state: GameState, index: number, player: Mark): GameState {
  if (state.status !== "playing") return state;
  if (state.turn !== player) return state;
  if (index < 0 || index > 8) return state;
  if (state.board[index] !== null) return state;

  const newBoard = [...state.board];
  newBoard[index] = player;

  const result = checkWinner(newBoard);
  if (result) {
    return { ...state, board: newBoard, status: "won", winner: result.winner, winLine: result.line };
  }

  if (newBoard.every((cell) => cell !== null)) {
    return { ...state, board: newBoard, status: "draw", winner: null, winLine: null };
  }

  return { ...state, board: newBoard, turn: player === "X" ? "O" : "X" };
}

export function resetForRematch(state: GameState): GameState {
  return {
    board: Array(9).fill(null) as Cell[],
    turn: "X",
    status: "playing",
    winner: null,
    winLine: null,
    players: state.players,
    rematchRequested: { X: false, O: false },
  };
}
