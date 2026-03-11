'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ── Types ──

type Board = number[][];
type Direction = 'up' | 'down' | 'left' | 'right';

// ── Game Logic (pure functions) ──

function createEmptyBoard(): Board {
  return Array.from({ length: 4 }, () => Array(4).fill(0));
}

function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

function getEmptyCells(board: Board): [number, number][] {
  const cells: [number, number][] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) cells.push([r, c]);
    }
  }
  return cells;
}

function addRandomTile(board: Board): Board {
  const empty = getEmptyCells(board);
  if (empty.length === 0) return board;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const newBoard = cloneBoard(board);
  newBoard[r][c] = Math.random() < 0.9 ? 2 : 4;
  return newBoard;
}

function initBoard(): Board {
  return addRandomTile(addRandomTile(createEmptyBoard()));
}

function slideRow(row: number[]): { result: number[]; score: number } {
  // Remove zeros
  const filtered = row.filter((v) => v !== 0);
  const result: number[] = [];
  let score = 0;

  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const merged = filtered[i] * 2;
      result.push(merged);
      score += merged;
      i += 2;
    } else {
      result.push(filtered[i]);
      i += 1;
    }
  }

  // Pad with zeros
  while (result.length < 4) result.push(0);
  return { result, score };
}

function rotateBoard(board: Board): Board {
  // Rotate 90 degrees clockwise
  const newBoard = createEmptyBoard();
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      newBoard[c][3 - r] = board[r][c];
    }
  }
  return newBoard;
}

function move(board: Board, direction: Direction): { board: Board; score: number; moved: boolean } {
  let rotated = cloneBoard(board);
  let rotations = 0;

  // Rotate so we always slide left
  switch (direction) {
    case 'left': rotations = 0; break;
    case 'down': rotations = 1; break;
    case 'right': rotations = 2; break;
    case 'up': rotations = 3; break;
  }

  for (let i = 0; i < rotations; i++) rotated = rotateBoard(rotated);

  let totalScore = 0;
  const slid = rotated.map((row) => {
    const { result, score } = slideRow(row);
    totalScore += score;
    return result;
  });

  // Rotate back
  let result = slid;
  for (let i = 0; i < (4 - rotations) % 4; i++) result = rotateBoard(result);

  const moved = !boardsEqual(board, result);
  return { board: result, score: totalScore, moved };
}

function boardsEqual(a: Board, b: Board): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}

function hasWon(board: Board): boolean {
  return board.some((row) => row.some((v) => v >= 2048));
}

function canMove(board: Board): boolean {
  // Empty cell exists
  if (getEmptyCells(board).length > 0) return true;
  // Adjacent equal cells
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const v = board[r][c];
      if (c + 1 < 4 && board[r][c + 1] === v) return true;
      if (r + 1 < 4 && board[r + 1][c] === v) return true;
    }
  }
  return false;
}

// ── Tile colors ──

function getTileStyle(value: number): { bg: string; fg: string } {
  const styles: Record<number, { bg: string; fg: string }> = {
    0:    { bg: 'color-mix(in srgb, var(--color-fg) 5%, transparent)', fg: 'transparent' },
    2:    { bg: 'color-mix(in srgb, var(--color-fg) 8%, transparent)', fg: 'var(--color-fg)' },
    4:    { bg: 'color-mix(in srgb, var(--color-fg) 12%, transparent)', fg: 'var(--color-fg)' },
    8:    { bg: '#f97316', fg: '#fff' },
    16:   { bg: '#fb923c', fg: '#fff' },
    32:   { bg: '#f87171', fg: '#fff' },
    64:   { bg: '#ef4444', fg: '#fff' },
    128:  { bg: '#fbbf24', fg: '#fff' },
    256:  { bg: '#f59e0b', fg: '#fff' },
    512:  { bg: '#d97706', fg: '#fff' },
    1024: { bg: '#b45309', fg: '#fff' },
    2048: { bg: '#92400e', fg: '#fff' },
  };
  return styles[value] ?? { bg: '#1e293b', fg: '#fff' };
}

function getTileFontSize(value: number): string {
  if (value >= 1024) return 'text-lg';
  if (value >= 128) return 'text-xl';
  return 'text-2xl';
}

// ── Component ──

export default function Game2048() {
  const [board, setBoard] = useState<Board>(initBoard);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [keepPlaying, setKeepPlaying] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // Load best score
  useEffect(() => {
    const saved = localStorage.getItem('2048-best');
    if (saved) setBest(Number(saved));
  }, []);

  const handleMove = useCallback(
    (direction: Direction) => {
      if (gameOver || (won && !keepPlaying)) return;

      const result = move(board, direction);
      if (!result.moved) return;

      const newBoard = addRandomTile(result.board);
      const newScore = score + result.score;
      setBoard(newBoard);
      setScore(newScore);

      if (newScore > best) {
        setBest(newScore);
        localStorage.setItem('2048-best', String(newScore));
      }

      if (!won && hasWon(newBoard)) {
        setWon(true);
      } else if (!canMove(newBoard)) {
        setGameOver(true);
      }
    },
    [board, score, best, gameOver, won, keepPlaying],
  );

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        handleMove(dir);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleMove]);

  // Touch / swipe
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;

    const minSwipe = 30;
    if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      handleMove(dx > 0 ? 'right' : 'left');
    } else {
      handleMove(dy > 0 ? 'down' : 'up');
    }
  };

  const restart = () => {
    setBoard(initBoard());
    setScore(0);
    setGameOver(false);
    setWon(false);
    setKeepPlaying(false);
  };

  const border = 'color-mix(in srgb, var(--color-fg) 12%, transparent)';

  return (
    <main className=" py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">2048</h1>
        <p className="mt-1 text-sm text-muted">
          タイルをスライド・結合して2048を目指そう。
        </p>
      </div>

      {/* Score */}
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex-1 rounded-lg border px-3 py-2 text-center"
          style={{ borderColor: border }}
        >
          <p className="font-mono text-[10px] uppercase text-muted">スコア</p>
          <p className="font-mono text-lg font-bold tabular-nums text-fg">{score}</p>
        </div>
        <div
          className="flex-1 rounded-lg border px-3 py-2 text-center"
          style={{ borderColor: border }}
        >
          <p className="font-mono text-[10px] uppercase text-muted">ベスト</p>
          <p className="font-mono text-lg font-bold tabular-nums text-fg">{best}</p>
        </div>
        <button
          onClick={restart}
          className="rounded-lg border px-4 py-3.5 font-mono text-xs transition-colors"
          style={{ borderColor: border, color: 'var(--color-fg)' }}
        >
          ニューゲーム
        </button>
      </div>

      {/* Board */}
      <div
        ref={boardRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="relative aspect-square w-full touch-none select-none rounded-xl border p-2"
        style={{
          borderColor: border,
          background: 'color-mix(in srgb, var(--color-fg) 3%, transparent)',
        }}
      >
        <div className="grid h-full grid-cols-4 gap-2">
          {board.flat().map((value, i) => {
            const style = getTileStyle(value);
            return (
              <div
                key={i}
                className={`flex items-center justify-center rounded-lg font-bold transition-colors ${getTileFontSize(value)}`}
                style={{ background: style.bg, color: style.fg }}
              >
                {value > 0 ? value : ''}
              </div>
            );
          })}
        </div>

        {/* Win overlay */}
        {won && !keepPlaying && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-xl bg-[color-mix(in_srgb,var(--color-bg)_80%,transparent)]">
            <p className="text-3xl font-bold text-fg">クリア!</p>
            <div className="flex gap-2">
              <button
                onClick={() => setKeepPlaying(true)}
                className="rounded-lg px-4 py-2 font-mono text-sm font-medium transition-colors"
                style={{ background: 'var(--color-fg)', color: 'var(--color-bg)' }}
              >
                続ける
              </button>
              <button
                onClick={restart}
                className="rounded-lg border px-4 py-2 font-mono text-sm transition-colors"
                style={{ borderColor: border, color: 'var(--color-fg)' }}
              >
                ニューゲーム
              </button>
            </div>
          </div>
        )}

        {/* Game over overlay */}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-xl bg-[color-mix(in_srgb,var(--color-bg)_80%,transparent)]">
            <p className="text-3xl font-bold text-fg">ゲームオーバー</p>
            <button
              onClick={restart}
              className="rounded-lg px-4 py-2 font-mono text-sm font-medium transition-colors"
              style={{ background: 'var(--color-fg)', color: 'var(--color-bg)' }}
            >
              もう一度
            </button>
          </div>
        )}
      </div>

      <p className="mt-4 text-center font-mono text-xs text-muted">
        矢印キーまたはスワイプでタイルを動かします。
      </p>
    </main>
  );
}
