'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ── Types (mirror server types) ──

type Player = 'R' | 'Y';
type Cell = 0 | 1 | 2; // 0=empty, 1=R, 2=Y

interface GameState {
  board: Cell[][]; // 6 rows x 7 columns
  turn: Player;
  status: 'waiting' | 'playing' | 'won' | 'draw';
  winner: Player | null;
  winCells: [number, number][] | null;
  players: { R: { connected: boolean } | null; Y: { connected: boolean } | null };
  rematchRequested: { R: boolean; Y: boolean };
}

type ServerMessage =
  | { type: 'joined'; playerId: Player; sessionId: string; state: GameState }
  | { type: 'state'; state: GameState }
  | { type: 'error'; message: string }
  | { type: 'opponent_connected' }
  | { type: 'opponent_disconnected' };

// ── Constants ──

const API_BASE =
  process.env.NEXT_PUBLIC_GAMES_API ?? 'https://games-api.0xjj.dev';

const ROWS = 6;
const COLS = 7;

const MAX_RECONNECT = 3;
const RECONNECT_DELAY = 2000;
const SESSION_KEY = 'connect-four';

const DISC_RED = '#ef4444';
const DISC_YELLOW = '#eab308';

const border = 'color-mix(in srgb, var(--color-fg) 12%, transparent)';

// ── Component ──

type Screen = 'lobby' | 'waiting' | 'playing';

export default function ConnectFour() {
  const [screen, setScreen] = useState<Screen>('lobby');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [joinInput, setJoinInput] = useState('');
  const [playerId, setPlayerId] = useState<Player | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const manualCloseRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // ── WebSocket connection ──

  const connectWs = useCallback((room: string, existingSessionId?: string) => {
    manualCloseRef.current = false;
    const wsBase = API_BASE.replace(/^http/, 'ws');
    let wsUrl = `${wsBase}/ws?game=connect-four&room=${room}`;
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
          setError('Reconnecting...');
          reconnectTimerRef.current = setTimeout(() => {
            connectWs(roomIdRef.current!, sid);
          }, RECONNECT_DELAY);
          return;
        }
        if (reconnectAttemptsRef.current >= MAX_RECONNECT) {
          setError('Connection lost');
        }
      }
    };

    ws.onerror = () => {
      setError('Connection error');
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
      const res = await fetch(`${API_BASE}/rooms?game=connect-four`, { method: 'POST' });
      const data: { roomId: string } = await res.json();
      const room = data.roomId;
      setRoomId(room);
      roomIdRef.current = room;
      window.history.replaceState(null, '', `?room=${room}`);
      connectWs(room);
    } catch {
      setError('Failed to create room');
    }
  };

  const joinRoom = () => {
    const input = joinInput.trim();
    if (!input) return;
    // Extract room ID from URL or raw ID
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

  const dropDisc = (column: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'drop', column }));
  };

  const requestRematch = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'rematch' }));
  };

  const copyLink = () => {
    const link = `${window.location.origin}/connect-four?room=${roomId}`;
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
    setRoomId(null);
    setPlayerId(null);
    setGameState(null);
    setError(null);
    setJoinInput('');
    setHoverCol(null);
    if (roomId) sessionStorage.removeItem(`${SESSION_KEY}-${roomId}`);
    reconnectAttemptsRef.current = 0;
    roomIdRef.current = null;
    window.history.replaceState(null, '', '/connect-four');
  };

  // ── Helpers ──

  const discColor = (cell: Cell): string => {
    if (cell === 1) return DISC_RED;
    if (cell === 2) return DISC_YELLOW;
    return 'transparent';
  };

  const playerColor = (player: Player): string => {
    return player === 'R' ? DISC_RED : DISC_YELLOW;
  };

  const playerLabel = (player: Player): string => {
    return player === 'R' ? 'Red' : 'Yellow';
  };

  const isWinCell = (row: number, col: number): boolean => {
    if (!gameState?.winCells) return false;
    return gameState.winCells.some(([r, c]) => r === row && c === col);
  };

  const isColumnPlayable = (col: number): boolean => {
    if (!gameState || gameState.status !== 'playing') return false;
    if (gameState.turn !== playerId) return false;
    // Column is playable if top cell is empty
    return gameState.board[0][col] === 0;
  };

  // ── Status text ──

  const getStatusText = (): string => {
    if (!gameState || !playerId) return '';
    if (gameState.status === 'waiting') return 'Waiting for opponent...';
    if (gameState.status === 'won') {
      return gameState.winner === playerId ? 'You win!' : 'You lose...';
    }
    if (gameState.status === 'draw') return "It's a draw!";
    return gameState.turn === playerId ? 'Your turn' : "Opponent's turn";
  };

  // ── Render ──

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="mb-8">
        <a
          href="/"
          className="mb-6 inline-block font-mono text-xs text-muted transition-colors hover:text-fg"
        >
          &larr; back
        </a>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Connect Four</h1>
        <p className="mt-1 text-sm text-muted">
          Drop discs to connect four in a row.
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
            Create Room
          </button>

          <div className="flex items-center gap-3 text-xs text-muted">
            <div className="h-px flex-1" style={{ background: border }} />
            <span className="font-mono">or join</span>
            <div className="h-px flex-1" style={{ background: border }} />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
              placeholder="Room ID or link"
              className="flex-1 rounded-lg border bg-transparent px-3 py-2.5 font-mono text-base text-fg outline-none transition-colors"
              style={{ borderColor: border }}
            />
            <button
              onClick={joinRoom}
              className="rounded-lg border px-4 py-2.5 font-mono text-sm transition-colors"
              style={{ borderColor: border, color: 'var(--color-fg)' }}
            >
              Join
            </button>
          </div>
        </div>
      )}

      {/* ── Waiting ── */}
      {screen === 'waiting' && (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted">Share this link with your opponent:</p>
          <div
            className="flex items-center gap-2 rounded-lg border px-3 py-2.5"
            style={{ borderColor: border }}
          >
            <span className="flex-1 truncate font-mono text-xs text-fg">
              {typeof window !== 'undefined'
                ? `${window.location.origin}/connect-four?room=${roomId}`
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
              {copied ? 'copied!' : 'copy'}
            </button>
          </div>
          <div className="flex items-center justify-center gap-2 py-4">
            <div
              className="h-2 w-2 animate-pulse rounded-full"
              style={{ background: 'var(--color-muted)' }}
            />
            <p className="font-mono text-xs text-muted">Waiting for opponent...</p>
          </div>
          <button
            onClick={backToLobby}
            className="font-mono text-xs text-muted transition-colors hover:text-fg"
          >
            Cancel
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
              You are{' '}
              <span style={{ color: playerColor(playerId), fontWeight: 600 }}>
                {playerLabel(playerId)}
              </span>
              {' · '}
              Room <span className="font-medium">{roomId}</span>
            </p>
          </div>

          {/* Board */}
          <div className="mx-auto w-fit">
            {/* Column hover indicators */}
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                gap: 0,
                marginBottom: 4,
              }}
            >
              {Array.from({ length: COLS }).map((_, col) => {
                const playable = isColumnPlayable(col);
                const isHovered = hoverCol === col && playable;
                return (
                  <div
                    key={col}
                    className="flex items-center justify-center"
                    style={{ width: 48, height: 20 }}
                  >
                    {isHovered && (
                      <div
                        className="rounded-full"
                        style={{
                          width: 12,
                          height: 12,
                          background: playerColor(playerId),
                          opacity: 0.6,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Game grid */}
            <div
              className="rounded-lg border overflow-hidden"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-fg) 20%, transparent)',
                background: 'color-mix(in srgb, var(--color-fg) 4%, transparent)',
              }}
            >
              {Array.from({ length: ROWS }).map((_, row) => (
                <div
                  key={row}
                  className="grid"
                  style={{
                    gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                    gap: 0,
                  }}
                >
                  {Array.from({ length: COLS }).map((_, col) => {
                    const cell = gameState.board[row][col];
                    const win = isWinCell(row, col);
                    const playable = isColumnPlayable(col);
                    return (
                      <button
                        key={col}
                        onClick={() => playable && dropDisc(col)}
                        onMouseEnter={() => setHoverCol(col)}
                        onMouseLeave={() => setHoverCol(null)}
                        disabled={!playable}
                        className="flex items-center justify-center transition-colors"
                        style={{
                          width: 48,
                          height: 48,
                          cursor: playable ? 'pointer' : 'default',
                          background: win
                            ? 'color-mix(in srgb, var(--color-accent) 20%, transparent)'
                            : 'transparent',
                          borderRight:
                            col < COLS - 1
                              ? '1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)'
                              : 'none',
                          borderBottom:
                            row < ROWS - 1
                              ? '1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)'
                              : 'none',
                        }}
                      >
                        <div
                          className="rounded-full transition-all"
                          style={{
                            width: 36,
                            height: 36,
                            background:
                              cell === 0
                                ? 'color-mix(in srgb, var(--color-fg) 6%, transparent)'
                                : discColor(cell),
                            boxShadow:
                              cell !== 0
                                ? `inset 0 2px 4px rgba(255,255,255,0.2), 0 1px 3px rgba(0,0,0,0.15)`
                                : 'none',
                          }}
                        />
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Turn indicator dots */}
          <div className="flex items-center justify-center gap-4 font-mono text-xs text-muted">
            <div className="flex items-center gap-1.5">
              <div
                className="rounded-full"
                style={{
                  width: 10,
                  height: 10,
                  background: DISC_RED,
                  opacity: gameState.turn === 'R' && gameState.status === 'playing' ? 1 : 0.3,
                }}
              />
              <span>Red{playerId === 'R' ? ' (you)' : ''}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="rounded-full"
                style={{
                  width: 10,
                  height: 10,
                  background: DISC_YELLOW,
                  opacity: gameState.turn === 'Y' && gameState.status === 'playing' ? 1 : 0.3,
                }}
              />
              <span>Yellow{playerId === 'Y' ? ' (you)' : ''}</span>
            </div>
          </div>

          {/* Game over actions */}
          {(gameState.status === 'won' || gameState.status === 'draw') && (
            <div className="space-y-3 text-center">
              {gameState.rematchRequested[playerId] ? (
                <p className="font-mono text-xs text-muted">
                  Waiting for opponent to accept rematch...
                </p>
              ) : (
                <button
                  onClick={requestRematch}
                  className="rounded-lg px-6 py-2.5 font-mono text-sm font-medium transition-colors"
                  style={{ background: 'var(--color-fg)', color: 'var(--color-bg)' }}
                >
                  Rematch
                </button>
              )}
              <div>
                <button
                  onClick={backToLobby}
                  className="font-mono text-xs text-muted transition-colors hover:text-fg"
                >
                  Back to lobby
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
