'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ── Types (mirror server types) ──

type Mark = 'X' | 'O';
type Cell = Mark | null;

interface GameState {
  board: Cell[];
  turn: Mark;
  status: 'waiting' | 'playing' | 'won' | 'draw';
  winner: Mark | null;
  winLine: number[] | null;
  players: { X: { connected: boolean } | null; O: { connected: boolean } | null };
  rematchRequested: { X: boolean; O: boolean };
}

type ServerMessage =
  | { type: 'joined'; playerId: Mark; state: GameState }
  | { type: 'state'; state: GameState }
  | { type: 'error'; message: string }
  | { type: 'opponent_connected' }
  | { type: 'opponent_disconnected' };

// ── Constants ──

const API_BASE =
  process.env.NEXT_PUBLIC_TICTACTOE_API ?? 'https://tictactoe-api.chihaya-watanabe.workers.dev';

// ── Component ──

type Screen = 'lobby' | 'waiting' | 'playing';

export default function TicTacToe() {
  const [screen, setScreen] = useState<Screen>('lobby');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [joinInput, setJoinInput] = useState('');
  const [playerId, setPlayerId] = useState<Mark | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // ── WebSocket connection ──

  const connectWs = useCallback((room: string) => {
    const wsUrl = `${API_BASE.replace(/^http/, 'ws')}/ws?room=${room}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setError(null);
    };

    ws.onmessage = (event) => {
      const msg: ServerMessage = JSON.parse(event.data);
      switch (msg.type) {
        case 'joined':
          setPlayerId(msg.playerId);
          setGameState(msg.state);
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
      connectWs(room);
    }
  }, [connectWs]);

  // ── Cleanup ──

  useEffect(() => {
    return () => {
      wsRef.current?.close();
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
      const res = await fetch(`${API_BASE}/rooms`, { method: 'POST' });
      const data = await res.json();
      const room = data.roomId as string;
      setRoomId(room);
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
    window.history.replaceState(null, '', `?room=${room}`);
    connectWs(room);
  };

  const makeMove = (index: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'move', index }));
  };

  const requestRematch = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'rematch' }));
  };

  const copyLink = () => {
    const link = `${window.location.origin}/tictactoe?room=${roomId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const backToLobby = () => {
    wsRef.current?.close();
    wsRef.current = null;
    setScreen('lobby');
    setRoomId(null);
    setPlayerId(null);
    setGameState(null);
    setError(null);
    setJoinInput('');
    window.history.replaceState(null, '', '/tictactoe');
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
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Tic-Tac-Toe</h1>
        <p className="mt-1 text-sm text-muted">
          Real-time multiplayer Tic-Tac-Toe. Create a room, share the link, and play.
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

          <div
            className="flex items-center gap-3 text-xs text-muted"
          >
            <div className="h-px flex-1" style={{ background: 'color-mix(in srgb, var(--color-fg) 12%, transparent)' }} />
            <span className="font-mono">or join</span>
            <div className="h-px flex-1" style={{ background: 'color-mix(in srgb, var(--color-fg) 12%, transparent)' }} />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
              placeholder="Room ID or link"
              className="flex-1 rounded-lg border bg-transparent px-3 py-2.5 font-mono text-sm text-fg outline-none transition-colors"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-fg) 12%, transparent)',
              }}
            />
            <button
              onClick={joinRoom}
              className="rounded-lg border px-4 py-2.5 font-mono text-sm transition-colors"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-fg) 12%, transparent)',
                color: 'var(--color-fg)',
              }}
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
            style={{ borderColor: 'color-mix(in srgb, var(--color-fg) 12%, transparent)' }}
          >
            <span className="flex-1 truncate font-mono text-xs text-fg">
              {typeof window !== 'undefined'
                ? `${window.location.origin}/tictactoe?room=${roomId}`
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
              You are <span style={{ color: playerId === 'X' ? 'var(--color-fg)' : 'var(--color-accent)' , fontWeight: 600 }}>{playerId}</span>
              {' · '}
              Room <span className="font-medium">{roomId}</span>
            </p>
          </div>

          {/* Board */}
          <div
            className="mx-auto grid w-fit grid-cols-3 gap-0 rounded-lg border overflow-hidden"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-fg) 20%, transparent)',
            }}
          >
            {gameState.board.map((cell, i) => {
              const isWinCell = gameState.winLine?.includes(i) ?? false;
              const isMyTurn = gameState.status === 'playing' && gameState.turn === playerId;
              const canClick = isMyTurn && cell === null;
              return (
                <button
                  key={i}
                  onClick={() => canClick && makeMove(i)}
                  disabled={!canClick}
                  className="flex items-center justify-center text-3xl font-bold transition-colors"
                  style={{
                    width: 84,
                    height: 84,
                    background: isWinCell
                      ? 'color-mix(in srgb, var(--color-accent) 20%, transparent)'
                      : 'transparent',
                    cursor: canClick ? 'pointer' : 'default',
                    borderRight: (i % 3 !== 2) ? '1px solid color-mix(in srgb, var(--color-fg) 20%, transparent)' : 'none',
                    borderBottom: i < 6 ? '1px solid color-mix(in srgb, var(--color-fg) 20%, transparent)' : 'none',
                    color: cell === 'X' ? 'var(--color-fg)' : 'var(--color-accent)',
                  }}
                >
                  {cell ?? ''}
                </button>
              );
            })}
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
