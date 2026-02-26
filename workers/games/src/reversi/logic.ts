import type { Cell, GameState, Mark } from "./types";

const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

function markNum(m: Mark): Cell { return m === "B" ? 1 : 2; }
function oppMark(m: Mark): Mark { return m === "B" ? "W" : "B"; }

export function createInitialState(): GameState {
  const board: Cell[][] = Array.from({ length: 8 }, () => Array(8).fill(0) as Cell[]);
  board[3][3] = 2; board[3][4] = 1;
  board[4][3] = 1; board[4][4] = 2;
  const validMoves = getValidMoves(board, 1);
  return {
    board, turn: "B", status: "waiting", winner: null,
    scores: { B: 2, W: 2 }, validMoves,
    players: { B: null, W: null }, rematchRequested: { B: false, W: false },
  };
}

function getFlips(board: Cell[][], row: number, col: number, mn: Cell): [number, number][] {
  if (board[row][col] !== 0) return [];
  const opp = mn === 1 ? 2 : 1;
  const allFlips: [number, number][] = [];
  for (const [dr, dc] of DIRS) {
    const flips: [number, number][] = [];
    let r = row + dr, c = col + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] === opp) {
      flips.push([r, c]); r += dr; c += dc;
    }
    if (flips.length > 0 && r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] === mn) {
      allFlips.push(...flips);
    }
  }
  return allFlips;
}

function getValidMoves(board: Cell[][], mn: Cell): [number, number][] {
  const moves: [number, number][] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (getFlips(board, r, c, mn).length > 0) moves.push([r, c]);
    }
  }
  return moves;
}

function countDiscs(board: Cell[][]): { B: number; W: number } {
  let B = 0, W = 0;
  for (const row of board) for (const cell of row) { if (cell === 1) B++; else if (cell === 2) W++; }
  return { B, W };
}

export function placeDisc(state: GameState, row: number, col: number, player: Mark): GameState {
  if (state.status !== "playing" || state.turn !== player) return state;
  if (row < 0 || row >= 8 || col < 0 || col >= 8) return state;

  const mn = markNum(player);
  const flips = getFlips(state.board, row, col, mn);
  if (flips.length === 0) return state;

  const newBoard = state.board.map((r) => [...r]);
  newBoard[row][col] = mn;
  for (const [fr, fc] of flips) newBoard[fr][fc] = mn;

  const scores = countDiscs(newBoard);
  const nextPlayer = oppMark(player);
  const nextMn = markNum(nextPlayer);
  let nextValidMoves = getValidMoves(newBoard, nextMn);

  // If opponent has no moves, turn stays
  let turn: Mark = nextPlayer;
  if (nextValidMoves.length === 0) {
    turn = player;
    nextValidMoves = getValidMoves(newBoard, mn);
    // If neither player can move, game ends
    if (nextValidMoves.length === 0) {
      const winner: Mark | "draw" = scores.B > scores.W ? "B" : scores.W > scores.B ? "W" : "draw";
      return { ...state, board: newBoard, status: "ended", winner, scores, validMoves: [] };
    }
  }

  // Check if board is full
  if (scores.B + scores.W === 64) {
    const winner: Mark | "draw" = scores.B > scores.W ? "B" : scores.W > scores.B ? "W" : "draw";
    return { ...state, board: newBoard, status: "ended", winner, scores, validMoves: [] };
  }

  return { ...state, board: newBoard, turn, scores, validMoves: nextValidMoves };
}

export function resetForRematch(state: GameState): GameState {
  const fresh = createInitialState();
  return { ...fresh, status: "playing", players: state.players };
}
