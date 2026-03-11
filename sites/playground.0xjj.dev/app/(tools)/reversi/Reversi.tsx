'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ── Types (mirror server types) ──

type Mark = 'B' | 'W';
type Cell = 0 | 1 | 2; // 0=empty, 1=Black, 2=White

interface GameState {
  board: Cell[][];
  turn: Mark;
  status: 'waiting' | 'playing' | 'ended';
  winner: Mark | 'draw' | null;
  scores: { B: number; W: number };
  validMoves: [number, number][];
  players: { B: { connected: boolean } | null; W: { connected: boolean } | null };
  rematchRequested: { B: boolean; W: boolean };
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
const SESSION_KEY = 'reversi';

const BOARD_SIZE = 8;
const CELL_SIZE = 44;
const BOARD_BG = '#15803d';

const border = 'color-mix(in srgb, var(--color-fg) 12%, transparent)';

// ── Component ──

type Screen = 'lobby' | 'waiting' | 'playing';

export default function Reversi() {
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

  // ── Helpers ──

  const isValidMove = useCallback(
    (row: number, col: number): boolean => {
      if (!gameState) return false;
      return gameState.validMoves.some(([r, c]) => r === row && c === col);
    },
    [gameState],
  );

  // ── WebSocket connection ──

  const connectWs = useCallback((room: string, existingSessionId?: string) => {
    manualCloseRef.current = false;
    const wsBase = API_BASE.replace(/^http/, 'ws');
    let wsUrl = `${wsBase}/ws?game=reversi&room=${room}`;
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
      const res = await fetch(`${API_BASE}/rooms?game=reversi`, { method: 'POST' });
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

  const placeDisc = (row: number, col: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'place', row, col }));
  };

  const requestRematch = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'rematch' }));
  };

  const copyLink = () => {
    const link = `${window.location.origin}/reversi?room=${roomId}`;
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
    window.history.replaceState(null, '', '/reversi');
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

  // ── Render ──

  return (
    <main className=" py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Reversi</h1>
        <p className="mt-1 text-sm text-muted">ディスクを挟んでひっくり返す定番の戦略ゲーム。</p>
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
                ? `${window.location.origin}/reversi?room=${roomId}`
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
        <div className="space-y-5">
          {/* Status */}
          <div className="text-center">
            <p className="font-mono text-sm text-fg">{getStatusText()}</p>
            <p className="mt-1 font-mono text-xs text-muted">
              あなたは{' '}
              <span style={{ fontWeight: 600 }}>
                {playerId === 'B' ? '黒' : '白'}
              </span>
              {' · '}
              ルーム <span className="font-medium">{roomId}</span>
            </p>
          </div>

          {/* Scores */}
          <div className="flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#111',
                  border: '1px solid #555',
                }}
              />
              <span
                className="font-mono text-sm"
                style={{
                  fontWeight: gameState.turn === 'B' && gameState.status === 'playing' ? 700 : 400,
                  color: playerId === 'B' ? 'var(--color-fg)' : 'var(--color-muted)',
                }}
              >
                黒: {gameState.scores.B}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#eee',
                  border: '1px solid #aaa',
                }}
              />
              <span
                className="font-mono text-sm"
                style={{
                  fontWeight: gameState.turn === 'W' && gameState.status === 'playing' ? 700 : 400,
                  color: playerId === 'W' ? 'var(--color-fg)' : 'var(--color-muted)',
                }}
              >
                白: {gameState.scores.W}
              </span>
            </div>
          </div>

          {/* Turn indicator */}
          {gameState.status === 'playing' && (
            <div className="flex items-center justify-center gap-2">
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: gameState.turn === 'B' ? '#111' : '#eee',
                  border: `1px solid ${gameState.turn === 'B' ? '#555' : '#aaa'}`,
                }}
              />
              <span className="font-mono text-xs text-muted">
                {gameState.turn === 'B' ? '黒' : '白'}のターン
              </span>
            </div>
          )}

          {/* Board */}
          <div
            className="mx-auto overflow-hidden rounded-lg"
            style={{
              width: CELL_SIZE * BOARD_SIZE + 2,
              border: '1px solid #0f5a2a',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${BOARD_SIZE}, ${CELL_SIZE}px)`,
                gridTemplateRows: `repeat(${BOARD_SIZE}, ${CELL_SIZE}px)`,
                background: BOARD_BG,
              }}
            >
              {gameState.board.flatMap((row, r) =>
                row.map((cell, c) => {
                  const isMyTurn =
                    gameState.status === 'playing' && gameState.turn === playerId;
                  const valid = isValidMove(r, c);
                  const canClick = isMyTurn && valid;

                  return (
                    <button
                      key={`${r}-${c}`}
                      onClick={() => canClick && placeDisc(r, c)}
                      disabled={!canClick}
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        background: 'transparent',
                        cursor: canClick ? 'pointer' : 'default',
                        borderRight: c < BOARD_SIZE - 1 ? '1px solid #1a6b35' : 'none',
                        borderBottom: r < BOARD_SIZE - 1 ? '1px solid #1a6b35' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        position: 'relative',
                      }}
                    >
                      {cell !== 0 && (
                        <div
                          style={{
                            width: CELL_SIZE - 10,
                            height: CELL_SIZE - 10,
                            borderRadius: '50%',
                            background: cell === 1 ? '#111' : '#eee',
                            boxShadow:
                              cell === 1
                                ? 'inset 0 -2px 4px rgba(255,255,255,0.15), 0 1px 3px rgba(0,0,0,0.4)'
                                : 'inset 0 -2px 4px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.3)',
                            transition: 'transform 0.15s ease',
                          }}
                        />
                      )}
                      {cell === 0 && valid && isMyTurn && (
                        <div
                          style={{
                            width: CELL_SIZE - 18,
                            height: CELL_SIZE - 18,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.15)',
                            position: 'absolute',
                          }}
                        />
                      )}
                    </button>
                  );
                }),
              )}
            </div>
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
