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
  | { type: 'joined'; playerId: Mark; sessionId: string; state: GameState }
  | { type: 'state'; state: GameState }
  | { type: 'error'; message: string }
  | { type: 'opponent_connected' }
  | { type: 'opponent_disconnected' };

// ── Constants ──

const API_BASE =
  process.env.NEXT_PUBLIC_GAMES_API ?? 'https://games-api.0xjj.dev';
const MAX_RECONNECT = 3;
const RECONNECT_DELAY = 2000;
const SESSION_KEY = 'tictactoe';

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
  const roomIdRef = useRef<string | null>(null);
  const manualCloseRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // ── WebSocket connection ──

  const connectWs = useCallback((room: string, existingSessionId?: string) => {
    manualCloseRef.current = false;
    let wsUrl = `${API_BASE.replace(/^http/, 'ws')}/ws?game=tictactoe&room=${room}`;
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
          if (roomIdRef.current) {
            sessionStorage.setItem(`${SESSION_KEY}-${roomIdRef.current}`, msg.sessionId);
          }
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
        const storedSessionId = sessionStorage.getItem(`${SESSION_KEY}-${roomIdRef.current}`);
        reconnectAttemptsRef.current += 1;
        if (reconnectAttemptsRef.current <= MAX_RECONNECT) {
          setError('再接続中...');
          reconnectTimerRef.current = setTimeout(() => {
            connectWs(roomIdRef.current!, storedSessionId ?? undefined);
          }, RECONNECT_DELAY);
        } else {
          setError('接続が切れました');
        }
      }
    };

    ws.onerror = () => {
      if (reconnectAttemptsRef.current === 0) {
        setError('接続エラー');
      }
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
      const res = await fetch(`${API_BASE}/rooms?game=tictactoe`, { method: 'POST' });
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
    manualCloseRef.current = true;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    wsRef.current?.close();
    wsRef.current = null;
    if (roomId) {
      sessionStorage.removeItem(`${SESSION_KEY}-${roomId}`);
    }
    reconnectAttemptsRef.current = 0;
    roomIdRef.current = null;
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
    if (gameState.status === 'waiting') return '対戦相手を待っています...';
    if (gameState.status === 'won') {
      return gameState.winner === playerId ? 'あなたの勝ち!' : 'あなたの負け...';
    }
    if (gameState.status === 'draw') return '引き分け!';
    return gameState.turn === playerId ? 'あなたのターン' : '相手のターン';
  };

  // ── Render ──

  return (
    <main className=" py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Tic-Tac-Toe</h1>
        <p className="mt-1 text-sm text-muted">
          リアルタイム対戦の三目並べ。ルームを作ってリンクを共有するだけで対戦開始。
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

          <div
            className="flex items-center gap-3 text-xs text-muted"
          >
            <div className="h-px flex-1" style={{ background: 'color-mix(in srgb, var(--color-fg) 12%, transparent)' }} />
            <span className="font-mono">または参加</span>
            <div className="h-px flex-1" style={{ background: 'color-mix(in srgb, var(--color-fg) 12%, transparent)' }} />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
              placeholder="ルームIDまたはリンク"
              className="flex-1 rounded-lg border bg-transparent px-3 py-2.5 font-mono text-base text-fg outline-none transition-colors"
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
              あなたは <span style={{ color: playerId === 'X' ? 'var(--color-fg)' : 'var(--color-accent)' , fontWeight: 600 }}>{playerId}</span>
              {' · '}
              ルーム <span className="font-medium">{roomId}</span>
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
