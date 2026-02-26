import type { GameState, Mark } from "./types";

const ROWS = 4; // box rows
const COLS = 4; // box cols

export function createInitialState(): GameState {
  return {
    hLines: Array.from({ length: ROWS + 1 }, () => Array(COLS).fill(false)),
    vLines: Array.from({ length: ROWS }, () => Array(COLS + 1).fill(false)),
    boxes: Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
    turn: "A",
    status: "waiting",
    scores: { A: 0, B: 0 },
    winner: null,
    players: { A: null, B: null },
    rematchRequested: { A: false, B: false },
    lastLine: null,
  };
}

function markNum(m: Mark): number { return m === "A" ? 1 : 2; }

function isBoxComplete(hLines: boolean[][], vLines: boolean[][], r: number, c: number): boolean {
  return hLines[r][c] && hLines[r + 1][c] && vLines[r][c] && vLines[r][c + 1];
}

export function drawLine(state: GameState, lineType: "h" | "v", row: number, col: number, player: Mark): GameState {
  if (state.status !== "playing" || state.turn !== player) return state;

  // Validate bounds
  if (lineType === "h") {
    if (row < 0 || row > ROWS || col < 0 || col >= COLS) return state;
    if (state.hLines[row][col]) return state; // Already drawn
  } else {
    if (row < 0 || row >= ROWS || col < 0 || col > COLS) return state;
    if (state.vLines[row][col]) return state;
  }

  const hLines = state.hLines.map((r) => [...r]);
  const vLines = state.vLines.map((r) => [...r]);
  const boxes = state.boxes.map((r) => [...r]);

  if (lineType === "h") hLines[row][col] = true;
  else vLines[row][col] = true;

  // Check adjacent boxes for completion
  const boxesToCheck: [number, number][] = [];
  if (lineType === "h") {
    if (row > 0) boxesToCheck.push([row - 1, col]);     // box above
    if (row < ROWS) boxesToCheck.push([row, col]);       // box below
  } else {
    if (col > 0) boxesToCheck.push([row, col - 1]);      // box left
    if (col < COLS) boxesToCheck.push([row, col]);        // box right
  }

  let completed = 0;
  const mn = markNum(player);
  for (const [br, bc] of boxesToCheck) {
    if (boxes[br][bc] === 0 && isBoxComplete(hLines, vLines, br, bc)) {
      boxes[br][bc] = mn;
      completed++;
    }
  }

  const scores = { A: 0, B: 0 };
  for (const row of boxes) for (const cell of row) {
    if (cell === 1) scores.A++;
    else if (cell === 2) scores.B++;
  }

  // If all boxes filled, game over
  const totalBoxes = ROWS * COLS;
  if (scores.A + scores.B === totalBoxes) {
    const winner: Mark | "draw" = scores.A > scores.B ? "A" : scores.B > scores.A ? "B" : "draw";
    return { ...state, hLines, vLines, boxes, scores, status: "ended", winner, lastLine: { type: lineType, row, col } };
  }

  // If player completed a box, they go again; otherwise turn switches
  const turn = completed > 0 ? player : (player === "A" ? "B" : "A");

  return { ...state, hLines, vLines, boxes, scores, turn, lastLine: { type: lineType, row, col } };
}

export function resetForRematch(state: GameState): GameState {
  const fresh = createInitialState();
  return { ...fresh, status: "playing", players: state.players };
}
