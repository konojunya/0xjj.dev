import type { Cell, GameState, Mark } from "./types";

const ROWS = 6;
const COLS = 7;

export function createInitialState(): GameState {
  return {
    board: Array.from({ length: ROWS }, () => Array(COLS).fill(0) as Cell[]),
    turn: "R",
    status: "waiting",
    winner: null,
    winCells: null,
    players: { R: null, Y: null },
    rematchRequested: { R: false, Y: false },
  };
}

function markNum(mark: Mark): Cell { return mark === "R" ? 1 : 2; }

export function dropDisc(state: GameState, column: number, player: Mark): GameState {
  if (state.status !== "playing" || state.turn !== player) return state;
  if (column < 0 || column >= COLS) return state;

  // Find lowest empty row
  let row = -1;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (state.board[r][column] === 0) { row = r; break; }
  }
  if (row === -1) return state; // Column full

  const newBoard = state.board.map((r) => [...r]);
  newBoard[row][column] = markNum(player);

  // Check win
  const winCells = checkWin(newBoard, row, column);
  if (winCells) {
    return { ...state, board: newBoard, status: "won", winner: player, winCells };
  }

  // Check draw
  if (newBoard[0].every((c) => c !== 0)) {
    return { ...state, board: newBoard, status: "draw", winner: null, winCells: null };
  }

  return { ...state, board: newBoard, turn: player === "R" ? "Y" : "R" };
}

function checkWin(board: Cell[][], row: number, col: number): [number, number][] | null {
  const mark = board[row][col];
  if (mark === 0) return null;

  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

  for (const [dr, dc] of directions) {
    const cells: [number, number][] = [[row, col]];
    for (const dir of [1, -1]) {
      let r = row + dr * dir;
      let c = col + dc * dir;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === mark) {
        cells.push([r, c]);
        r += dr * dir;
        c += dc * dir;
      }
    }
    if (cells.length >= 4) return cells;
  }
  return null;
}

export function resetForRematch(state: GameState): GameState {
  return {
    board: Array.from({ length: ROWS }, () => Array(COLS).fill(0) as Cell[]),
    turn: "R",
    status: "playing",
    winner: null,
    winCells: null,
    players: state.players,
    rematchRequested: { R: false, Y: false },
  };
}
