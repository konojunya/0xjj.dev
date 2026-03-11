'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ── Types (mirror server types) ──

type Mark = 'A' | 'B';

interface GameState {
  hLines: boolean[][];   // 5 rows x 4 cols
  vLines: boolean[][];   // 4 rows x 5 cols
  boxes: number[][];     // 4 rows x 4 cols (0=unclaimed, 1=A, 2=B)
  turn: Mark;
  status: 'waiting' | 'playing' | 'ended';
  scores: { A: number; B: number };
  winner: Mark | 'draw' | null;
  players: { A: { connected: boolean } | null; B: { connected: boolean } | null };
  rematchRequested: { A: boolean; B: boolean };
  lastLine: { lineType: 'h' | 'v'; row: number; col: number } | null;
}

type ServerMessage =
  | { type: 'joined'; playerId: Mark; sessionId: string; state: GameState }
  | { type: 'state'; state: GameState }
  | { type: 'error'; message: string }
  | { type: 'opponent_connected' }
  | { type: 'opponent_disconnected' };

// ── Constants ──

const API_BASE = process.env.NEXT_PUBLIC_GAMES_API ?? 'https://games-api.0xjj.dev';
const MAX_RECONNECT = 3;
const RECONNECT_DELAY = 2000;
const SESSION_KEY = 'dots-and-boxes';

const PLAYER_A_COLOR = '#3b82f6';
const PLAYER_B_COLOR = '#ef4444';

const DOT_SIZE = 12;
const LINE_THICKNESS = 6;
const LINE_LENGTH = 52;
const BOX_SIZE = LINE_LENGTH;

// ── Component ──

type Screen = 'lobby' | 'waiting' | 'playing';

export default function DotsAndBoxes() {
  const [screen, setScreen] = useState<Screen>('lobby');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [joinInput, setJoinInput] = useState('');
  const [playerId, setPlayerId] = useState<Mark | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const manualCloseRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const border = 'color-mix(in srgb, var(--color-fg) 12%, transparent)';

  // ── WebSocket connection ──

  const connectWs = useCallback((room: string, existingSessionId?: string) => {
    manualCloseRef.current = false;
    const wsBase = API_BASE.replace(/^http/, 'ws');
    let wsUrl = `${wsBase}/ws?game=dots-and-boxes&room=${room}`;
    if (existingSessionId) {
      wsUrl += `&playerId=${existingSessionId}`;
    }
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setError(null);
    };

    ws.onmessage = (event) => {
      if (event.data === 'pong') return;
      const msg: ServerMessage = JSON.parse(event.data);
      switch (msg.type) {
        case 'joined':
          setPlayerId(msg.playerId);
          setGameState(msg.state);
          sessionStorage.setItem(`${SESSION_KEY}-${room}`, msg.sessionId);
          reconnectAttemptsRef.current = 0;
          if (msg.state.status === 'waiting') {
            setScreen('waiting');
          } else {
            setScreen('playing');
          }
          break;
        case 'state':
          setGameState(msg.state);
          if (msg.state.status !== 'waiting') {
            setScreen('playing');
          }
          break;
        case 'opponent_connected':
          break;
        case 'opponent_disconnected':
          break;
        case 'error':
          setError(msg.message);
          break;
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (!manualCloseRef.current && roomIdRef.current) {
        const sid = sessionStorage.getItem(`${SESSION_KEY}-${roomIdRef.current}`);
        if (sid && reconnectAttemptsRef.current < MAX_RECONNECT) {
          reconnectAttemptsRef.current++;
          setError('再接続中...');
          reconnectTimerRef.current = setTimeout(() => {
            connectWs(roomIdRef.current!, sid);
          }, RECONNECT_DELAY);
          return;
        }
        if (reconnectAttemptsRef.current >= MAX_RECONNECT) {
          setError('接続が切れました');
        }
      }
    };

    ws.onerror = () => {
      setError('接続エラー');
    };
  }, []);

  // ── Auto-join from URL ──

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      setRoomId(room);
      roomIdRef.current = room;
      connectWs(room);
    }
  }, [connectWs]);

  // ── Cleanup ──

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, []);

  // ── Keepalive ──

  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send('ping');
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // ── Actions ──

  const createRoom = async () => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/rooms?game=dots-and-boxes`, { method: 'POST' });
      const data: { roomId: string } = await res.json();
      const room = data.roomId;
      setRoomId(room);
      roomIdRef.current = room;
      window.history.replaceState(null, '', `?room=${room}`);
      connectWs(room);
    } catch {
      setError('ルームの作成に失敗しました');
    }
  };

  const joinRoom = () => {
    const input = joinInput.trim();
    if (!input) return;
    let room = input;
    try {
      const url = new URL(input);
      const r = url.searchParams.get('room');
      if (r) room = r;
    } catch {
      // Not a URL, use as-is
    }
    setRoomId(room);
    roomIdRef.current = room;
    window.history.replaceState(null, '', `?room=${room}`);
    connectWs(room);
  };

  const drawLine = (lineType: 'h' | 'v', row: number, col: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'line', lineType, row, col }));
  };

  const requestRematch = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'rematch' }));
  };

  const copyLink = () => {
    const link = `${window.location.origin}/dots-and-boxes?room=${roomId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const backToLobby = () => {
    manualCloseRef.current = true;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    wsRef.current?.close();
    wsRef.current = null;
    setScreen('lobby');
    if (roomId) sessionStorage.removeItem(`${SESSION_KEY}-${roomId}`);
    reconnectAttemptsRef.current = 0;
    roomIdRef.current = null;
    setRoomId(null);
    setPlayerId(null);
    setGameState(null);
    setError(null);
    setJoinInput('');
    window.history.replaceState(null, '', '/dots-and-boxes');
  };

  // ── Status text ──

  const getStatusText = (): string => {
    if (!gameState || !playerId) return '';
    if (gameState.status === 'waiting') return '対戦相手を待っています...';
    if (gameState.status === 'ended') {
      if (gameState.winner === 'draw') return '引き分け!';
      return gameState.winner === playerId ? 'あなたの勝ち!' : 'あなたの負け...';
    }
    return gameState.turn === playerId ? 'あなたのターン' : '相手のターン';
  };

  const getPlayerColor = (mark: Mark): string => {
    return mark === 'A' ? PLAYER_A_COLOR : PLAYER_B_COLOR;
  };

  const getBoxColor = (value: number): string => {
    if (value === 1) return `color-mix(in srgb, ${PLAYER_A_COLOR} 25%, transparent)`;
    if (value === 2) return `color-mix(in srgb, ${PLAYER_B_COLOR} 25%, transparent)`;
    return 'transparent';
  };

  const getBoxBorderColor = (value: number): string => {
    if (value === 1) return `color-mix(in srgb, ${PLAYER_A_COLOR} 40%, transparent)`;
    if (value === 2) return `color-mix(in srgb, ${PLAYER_B_COLOR} 40%, transparent)`;
    return 'transparent';
  };

  // ── Board rendering ──

  const renderBoard = () => {
    if (!gameState || !playerId) return null;

    const isMyTurn = gameState.status === 'playing' && gameState.turn === playerId;
    const rows = 5;
    const cols = 5;

    const elements: React.ReactElement[] = [];

    // The board is built as a CSS grid where:
    // - Even rows/cols are dots
    // - Odd cols in even rows are horizontal lines
    // - Odd rows with even cols are vertical lines
    // - Odd rows with odd cols are box fills
    const gridRows = rows * 2 - 1; // 9
    const gridCols = cols * 2 - 1; // 9

    for (let gr = 0; gr < gridRows; gr++) {
      for (let gc = 0; gc < gridCols; gc++) {
        const isEvenRow = gr % 2 === 0;
        const isEvenCol = gc % 2 === 0;

        if (isEvenRow && isEvenCol) {
          // Dot
          elements.push(
            <div
              key={`dot-${gr}-${gc}`}
              style={{
                width: DOT_SIZE,
                height: DOT_SIZE,
                borderRadius: '50%',
                background: 'var(--color-fg)',
                gridRow: gr + 1,
                gridColumn: gc + 1,
                zIndex: 2,
              }}
            />
          );
        } else if (isEvenRow && !isEvenCol) {
          // Horizontal line
          const row = gr / 2;
          const col = (gc - 1) / 2;
          const drawn = gameState.hLines[row]?.[col] ?? false;
          const isLast =
            gameState.lastLine?.lineType === 'h' &&
            gameState.lastLine.row === row &&
            gameState.lastLine.col === col;
          const canClick = isMyTurn && !drawn;

          elements.push(
            <button
              key={`h-${row}-${col}`}
              onClick={() => canClick && drawLine('h', row, col)}
              disabled={!canClick}
              style={{
                width: LINE_LENGTH,
                height: LINE_THICKNESS,
                gridRow: gr + 1,
                gridColumn: gc + 1,
                border: 'none',
                borderRadius: LINE_THICKNESS / 2,
                background: drawn
                  ? isLast
                    ? 'var(--color-fg)'
                    : 'color-mix(in srgb, var(--color-fg) 70%, transparent)'
                  : 'color-mix(in srgb, var(--color-fg) 10%, transparent)',
                cursor: canClick ? 'pointer' : 'default',
                padding: 0,
                transition: 'background 0.15s',
                alignSelf: 'center',
                justifySelf: 'center',
              }}
              onMouseEnter={(e) => {
                if (canClick) {
                  e.currentTarget.style.background =
                    'color-mix(in srgb, var(--color-fg) 40%, transparent)';
                }
              }}
              onMouseLeave={(e) => {
                if (canClick) {
                  e.currentTarget.style.background =
                    'color-mix(in srgb, var(--color-fg) 10%, transparent)';
                }
              }}
              aria-label={`Horizontal line row ${row} col ${col}`}
            />
          );
        } else if (!isEvenRow && isEvenCol) {
          // Vertical line
          const row = (gr - 1) / 2;
          const col = gc / 2;
          const drawn = gameState.vLines[row]?.[col] ?? false;
          const isLast =
            gameState.lastLine?.lineType === 'v' &&
            gameState.lastLine.row === row &&
            gameState.lastLine.col === col;
          const canClick = isMyTurn && !drawn;

          elements.push(
            <button
              key={`v-${row}-${col}`}
              onClick={() => canClick && drawLine('v', row, col)}
              disabled={!canClick}
              style={{
                width: LINE_THICKNESS,
                height: LINE_LENGTH,
                gridRow: gr + 1,
                gridColumn: gc + 1,
                border: 'none',
                borderRadius: LINE_THICKNESS / 2,
                background: drawn
                  ? isLast
                    ? 'var(--color-fg)'
                    : 'color-mix(in srgb, var(--color-fg) 70%, transparent)'
                  : 'color-mix(in srgb, var(--color-fg) 10%, transparent)',
                cursor: canClick ? 'pointer' : 'default',
                padding: 0,
                transition: 'background 0.15s',
                alignSelf: 'center',
                justifySelf: 'center',
              }}
              onMouseEnter={(e) => {
                if (canClick) {
                  e.currentTarget.style.background =
                    'color-mix(in srgb, var(--color-fg) 40%, transparent)';
                }
              }}
              onMouseLeave={(e) => {
                if (canClick) {
                  e.currentTarget.style.background =
                    'color-mix(in srgb, var(--color-fg) 10%, transparent)';
                }
              }}
              aria-label={`Vertical line row ${row} col ${col}`}
            />
          );
        } else {
          // Box fill (odd row, odd col)
          const boxRow = (gr - 1) / 2;
          const boxCol = (gc - 1) / 2;
          const value = gameState.boxes[boxRow]?.[boxCol] ?? 0;

          elements.push(
            <div
              key={`box-${boxRow}-${boxCol}`}
              style={{
                width: LINE_LENGTH,
                height: LINE_LENGTH,
                gridRow: gr + 1,
                gridColumn: gc + 1,
                background: getBoxColor(value),
                border: value ? `1px solid ${getBoxBorderColor(value)}` : 'none',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
                alignSelf: 'center',
                justifySelf: 'center',
              }}
            >
              {value !== 0 && (
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    color: value === 1 ? PLAYER_A_COLOR : PLAYER_B_COLOR,
                  }}
                >
                  {value === 1 ? 'A' : 'B'}
                </span>
              )}
            </div>
          );
        }
      }
    }

    const totalWidth = 5 * DOT_SIZE + 4 * LINE_LENGTH;
    const totalHeight = 5 * DOT_SIZE + 4 * LINE_LENGTH;

    return (
      <div
        style={{
          display: 'inline-grid',
          gridTemplateColumns: Array.from({ length: gridCols }, (_, i) =>
            i % 2 === 0 ? `${DOT_SIZE}px` : `${LINE_LENGTH}px`
          ).join(' '),
          gridTemplateRows: Array.from({ length: gridRows }, (_, i) =>
            i % 2 === 0 ? `${DOT_SIZE}px` : `${LINE_LENGTH}px`
          ).join(' '),
          width: totalWidth,
          height: totalHeight,
          alignItems: 'center',
          justifyItems: 'center',
        }}
      >
        {elements}
      </div>
    );
  };

  // ── Render ──

  return (
    <main className=" py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Dots & Boxes</h1>
        <p className="mt-1 text-sm text-muted">
          線を引いてボックスを完成させ、相手より多くのボックスを取ろう。
        </p>
      </div>

      {error && (
        <p
          className="mb-4 rounded-lg border px-3 py-2 font-mono text-xs"
          style={{
            borderColor: 'color-mix(in srgb, #ef4444 40%, transparent)',
            color: '#ef4444',
            background: 'color-mix(in srgb, #ef4444 8%, transparent)',
          }}
        >
          {error}
        </p>
      )}

      {/* ── Lobby ── */}
      {screen === 'lobby' && (
        <div className="space-y-6">
          <button
            onClick={createRoom}
            className="w-full rounded-lg px-4 py-3 font-mono text-sm font-medium transition-colors"
            style={{ background: 'var(--color-fg)', color: 'var(--color-bg)' }}
          >
            ルームを作成
          </button>

          <div className="flex items-center gap-3 text-xs text-muted">
            <div className="h-px flex-1" style={{ background: border }} />
            <span className="font-mono">または参加</span>
            <div className="h-px flex-1" style={{ background: border }} />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
              placeholder="ルームIDまたはリンク"
              className="flex-1 rounded-lg border bg-transparent px-3 py-2.5 font-mono text-base text-fg outline-none transition-colors"
              style={{ borderColor: border }}
            />
            <button
              onClick={joinRoom}
              className="rounded-lg border px-4 py-2.5 font-mono text-sm transition-colors"
              style={{ borderColor: border, color: 'var(--color-fg)' }}
            >
              参加
            </button>
          </div>
        </div>
      )}

      {/* ── Waiting ── */}
      {screen === 'waiting' && (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted">このリンクを対戦相手に共有してください:</p>
          <div
            className="flex items-center gap-2 rounded-lg border px-3 py-2.5"
            style={{ borderColor: border }}
          >
            <span className="flex-1 truncate font-mono text-xs text-fg">
              {typeof window !== 'undefined'
                ? `${window.location.origin}/dots-and-boxes?room=${roomId}`
                : ''}
            </span>
            <button
              onClick={copyLink}
              className="rounded px-2 py-0.5 font-mono text-xs transition-colors"
              style={{
                background: 'color-mix(in srgb, var(--color-fg) 8%, transparent)',
                color: 'var(--color-muted)',
              }}
            >
              {copied ? 'コピー済み!' : 'コピー'}
            </button>
          </div>
          <div className="flex items-center justify-center gap-2 py-4">
            <div
              className="h-2 w-2 animate-pulse rounded-full"
              style={{ background: 'var(--color-muted)' }}
            />
            <p className="font-mono text-xs text-muted">対戦相手を待っています...</p>
          </div>
          <button
            onClick={backToLobby}
            className="font-mono text-xs text-muted transition-colors hover:text-fg"
          >
            キャンセル
          </button>
        </div>
      )}

      {/* ── Playing / Game Over ── */}
      {screen === 'playing' && gameState && playerId && (
        <div className="space-y-6">
          {/* Status */}
          <div className="text-center">
            <p className="font-mono text-sm text-fg">{getStatusText()}</p>
            <p className="mt-1 font-mono text-xs text-muted">
              あなたは{' '}
              <span style={{ color: getPlayerColor(playerId), fontWeight: 600 }}>
                プレイヤー{playerId}
              </span>
              {' · '}
              ルーム <span className="font-medium">{roomId}</span>
            </p>
          </div>

          {/* Scores */}
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <p
                className="font-mono text-xs font-medium"
                style={{ color: PLAYER_A_COLOR }}
              >
                プレイヤーA{playerId === 'A' ? ' (あなた)' : ''}
              </p>
              <p
                className="mt-0.5 font-mono text-2xl font-bold"
                style={{ color: PLAYER_A_COLOR }}
              >
                {gameState.scores.A}
              </p>
            </div>
            <div
              className="h-8 w-px"
              style={{ background: border }}
            />
            <div className="text-center">
              <p
                className="font-mono text-xs font-medium"
                style={{ color: PLAYER_B_COLOR }}
              >
                プレイヤーB{playerId === 'B' ? ' (あなた)' : ''}
              </p>
              <p
                className="mt-0.5 font-mono text-2xl font-bold"
                style={{ color: PLAYER_B_COLOR }}
              >
                {gameState.scores.B}
              </p>
            </div>
          </div>

          {/* Turn indicator */}
          {gameState.status === 'playing' && (
            <div className="flex items-center justify-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{
                  background: getPlayerColor(gameState.turn),
                  animation: gameState.turn === playerId ? 'pulse 2s infinite' : 'none',
                }}
              />
              <p className="font-mono text-xs text-muted">
                {gameState.turn === playerId ? 'あなたのターン' : '相手のターン'}
                {' — '}
                <span style={{ color: getPlayerColor(gameState.turn), fontWeight: 600 }}>
                  プレイヤー{gameState.turn}
                </span>
              </p>
            </div>
          )}

          {/* Board */}
          <div className="flex justify-center">
            {renderBoard()}
          </div>

          {/* Game over actions */}
          {gameState.status === 'ended' && (
            <div className="space-y-3 text-center">
              {gameState.rematchRequested[playerId] ? (
                <p className="font-mono text-xs text-muted">
                  相手のリマッチ承諾を待っています...
                </p>
              ) : (
                <button
                  onClick={requestRematch}
                  className="rounded-lg px-6 py-2.5 font-mono text-sm font-medium transition-colors"
                  style={{ background: 'var(--color-fg)', color: 'var(--color-bg)' }}
                >
                  リマッチ
                </button>
              )}
              <div>
                <button
                  onClick={backToLobby}
                  className="font-mono text-xs text-muted transition-colors hover:text-fg"
                >
                  ロビーに戻る
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
