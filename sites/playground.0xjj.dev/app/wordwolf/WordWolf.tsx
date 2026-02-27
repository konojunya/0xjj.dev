'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ── Types (mirror server) ──

interface Player {
  id: string;
  name: string;
  connected: boolean;
}

type ServerMessage =
  | { type: 'joined'; playerId: string; players: Record<string, Player>; isHost: boolean; hostId: string }
  | { type: 'player_joined'; players: Record<string, Player>; hostId: string }
  | { type: 'player_left'; players: Record<string, Player>; hostId: string }
  | { type: 'game_started'; word: string; phase: 'playing'; endTime: number; players: Record<string, Player> }
  | { type: 'phase_changed'; phase: 'voting' }
  | { type: 'vote_update'; voteCount: Record<string, number> }
  | {
      type: 'result';
      wolfId: string;
      wolfWord: string;
      citizenWord: string;
      votes: Record<string, string>;
      winner: 'citizen' | 'wolf';
      canGuess: boolean;
    }
  | { type: 'guess_result'; correct: boolean; winner: 'citizen' | 'wolf' }
  | { type: 'returned_to_lobby'; players: Record<string, Player>; hostId: string }
  | { type: 'error'; message: string };

// ── Constants ──

const API_BASE =
  process.env.NEXT_PUBLIC_GAMES_API ?? 'https://games-api.0xjj.dev';
const MAX_RECONNECT = 3;
const RECONNECT_DELAY = 2000;
const SESSION_KEY = 'wordwolf';

type Screen = 'lobby' | 'waiting' | 'playing' | 'voting' | 'result';

export default function WordWolf() {
  const [screen, setScreen] = useState<Screen>('lobby');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [joinInput, setJoinInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [hostId, setHostId] = useState<string | null>(null);
  const [myWord, setMyWord] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [resultData, setResultData] = useState<{
    wolfId: string;
    wolfWord: string;
    citizenWord: string;
    votes: Record<string, string>;
    winner: 'citizen' | 'wolf';
    canGuess: boolean;
  } | null>(null);
  const [guessInput, setGuessInput] = useState('');
  const [guessResult, setGuessResult] = useState<{ correct: boolean; winner: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const nameRef = useRef('');
  const roomIdRef = useRef<string | null>(null);
  const manualCloseRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // ── WebSocket ──

  const connectWs = useCallback((room: string, existingSessionId?: string) => {
    manualCloseRef.current = false;
    let wsUrl = `${API_BASE.replace(/^http/, 'ws')}/ws?game=wordwolf&room=${room}`;
    if (existingSessionId) wsUrl += `&playerId=${existingSessionId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setError(null);
      // Only send join for new connections (not reconnections)
      if (!existingSessionId) {
        ws.send(JSON.stringify({ type: 'join', name: nameRef.current }));
      }
    };

    ws.onmessage = (event) => {
      if (event.data === 'pong') return;
      const msg: ServerMessage = JSON.parse(event.data);
      reconnectAttemptsRef.current = 0;

      switch (msg.type) {
        case 'joined':
          setPlayerId(msg.playerId);
          setPlayers(msg.players);
          setHostId(msg.hostId);
          setScreen('waiting');
          if (roomIdRef.current) {
            sessionStorage.setItem(`${SESSION_KEY}-${roomIdRef.current}`, msg.playerId);
          }
          break;
        case 'player_joined':
          setPlayers(msg.players);
          setHostId(msg.hostId);
          break;
        case 'player_left':
          setPlayers(msg.players);
          setHostId(msg.hostId);
          break;
        case 'game_started':
          setMyWord(msg.word);
          setEndTime(msg.endTime);
          setPlayers(msg.players);
          setScreen('playing');
          setHasVoted(false);
          setSelectedVote(null);
          setVoteCounts({});
          setResultData(null);
          setGuessResult(null);
          setGuessInput('');
          break;
        case 'phase_changed':
          if (msg.phase === 'voting') {
            setScreen('voting');
            setHasVoted(false);
            setSelectedVote(null);
            setVoteCounts({});
          }
          break;
        case 'vote_update':
          setVoteCounts(msg.voteCount);
          break;
        case 'result':
          setResultData(msg);
          setScreen('result');
          break;
        case 'guess_result':
          setGuessResult(msg);
          setResultData((prev) =>
            prev ? { ...prev, winner: msg.winner, canGuess: false } : prev,
          );
          break;
        case 'returned_to_lobby':
          setPlayers(msg.players);
          setHostId(msg.hostId);
          setScreen('waiting');
          setMyWord(null);
          setEndTime(null);
          setResultData(null);
          setGuessResult(null);
          setHasVoted(false);
          setSelectedVote(null);
          setVoteCounts({});
          setGuessInput('');
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
      if (reconnectAttemptsRef.current === 0) setError('Connection error');
    };
  }, []);

  // ── Auto-fill room from URL ──

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) setJoinInput(room);
  }, []);

  // ── Cleanup ──

  useEffect(() => {
    return () => {
      manualCloseRef.current = true;
      wsRef.current?.close();
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

  // ── Countdown timer ──

  useEffect(() => {
    if (!endTime || screen !== 'playing') return;
    const tick = () => {
      setTimeLeft(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endTime, screen]);

  // ── Actions ──

  const createRoom = async () => {
    if (!nameInput.trim()) {
      setError('Please enter your name');
      return;
    }
    setError(null);
    nameRef.current = nameInput.trim();
    try {
      const res = await fetch(`${API_BASE}/rooms?game=wordwolf`, { method: 'POST' });
      const data = await res.json();
      const room = data.roomId as string;
      setRoomId(room);
      roomIdRef.current = room;
      window.history.replaceState(null, '', `?room=${room}`);
      connectWs(room);
    } catch {
      setError('Failed to create room');
    }
  };

  const joinRoom = () => {
    if (!nameInput.trim()) {
      setError('Please enter your name');
      return;
    }
    let room = joinInput.trim();
    if (!room) return;
    try {
      const url = new URL(room);
      const r = url.searchParams.get('room');
      if (r) room = r;
    } catch {
      // Not a URL
    }
    nameRef.current = nameInput.trim();
    setRoomId(room);
    roomIdRef.current = room;
    window.history.replaceState(null, '', `?room=${room}`);
    connectWs(room);
  };

  const startGame = () => {
    wsRef.current?.send(JSON.stringify({ type: 'start' }));
  };

  const castVote = (targetId: string) => {
    if (hasVoted) return;
    wsRef.current?.send(JSON.stringify({ type: 'vote', targetId }));
    setHasVoted(true);
    setSelectedVote(targetId);
  };

  const submitGuess = () => {
    if (!guessInput.trim()) return;
    wsRef.current?.send(JSON.stringify({ type: 'guess', word: guessInput.trim() }));
  };

  const playAgain = () => {
    wsRef.current?.send(JSON.stringify({ type: 'play_again' }));
  };

  const copyLink = () => {
    const link = `${window.location.origin}/wordwolf?room=${roomId}`;
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
    setRoomId(null);
    setPlayerId(null);
    setPlayers({});
    setHostId(null);
    setMyWord(null);
    setEndTime(null);
    setResultData(null);
    setGuessResult(null);
    setError(null);
    setJoinInput('');
    setHasVoted(false);
    setSelectedVote(null);
    setVoteCounts({});
    setGuessInput('');
    reconnectAttemptsRef.current = 0;
    roomIdRef.current = null;
    window.history.replaceState(null, '', '/wordwolf');
  };

  // ── Helpers ──

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const playerList = Object.values(players);
  const isHost = playerId === hostId;
  const canStart = isHost && playerList.length >= 3;

  const border = 'color-mix(in srgb, var(--color-fg) 12%, transparent)';

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
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Word Wolf</h1>
        <p className="mt-1 text-sm text-muted">
          Find the wolf hiding among your friends!
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
          <div>
            <label className="mb-1.5 block font-mono text-xs text-muted">Name</label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-lg border bg-transparent px-3 py-2.5 font-mono text-base text-fg outline-none transition-colors"
              style={{ borderColor: border }}
            />
          </div>

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

      {/* ── Waiting Room ── */}
      {screen === 'waiting' && (
        <div className="space-y-5">
          {/* Share link */}
          <div
            className="flex items-center gap-2 rounded-lg border px-3 py-2.5"
            style={{ borderColor: border }}
          >
            <span className="flex-1 truncate font-mono text-xs text-fg">
              {typeof window !== 'undefined'
                ? `${window.location.origin}/wordwolf?room=${roomId}`
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

          {/* Player list */}
          <div>
            <p className="mb-2 font-mono text-xs text-muted">
              Players ({playerList.length}/8)
            </p>
            <ul className="space-y-1.5">
              {playerList.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2"
                  style={{
                    borderColor: border,
                    background: 'color-mix(in srgb, var(--color-fg) 3%, transparent)',
                  }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: p.connected ? '#22c55e' : 'var(--color-muted)' }}
                  />
                  <span className="font-mono text-sm text-fg">{p.name}</span>
                  {p.id === hostId && (
                    <span className="ml-auto font-mono text-xs text-muted">host</span>
                  )}
                  {p.id === playerId && p.id !== hostId && (
                    <span className="ml-auto font-mono text-xs text-muted">you</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Start / hint */}
          {isHost ? (
            <div className="space-y-2 text-center">
              <button
                onClick={startGame}
                disabled={!canStart}
                className="w-full rounded-lg px-4 py-3 font-mono text-sm font-medium transition-colors disabled:opacity-40"
                style={{ background: 'var(--color-fg)', color: 'var(--color-bg)' }}
              >
                Start Game
              </button>
              {playerList.length < 3 && (
                <p className="font-mono text-xs text-muted">Need at least 3 players to start</p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-2">
              <div
                className="h-2 w-2 animate-pulse rounded-full"
                style={{ background: 'var(--color-muted)' }}
              />
              <p className="font-mono text-xs text-muted">Waiting for the host to start the game...</p>
            </div>
          )}

          <button
            onClick={backToLobby}
            className="block w-full text-center font-mono text-xs text-muted transition-colors hover:text-fg"
          >
            Leave
          </button>
        </div>
      )}

      {/* ── Playing ── */}
      {screen === 'playing' && myWord && (
        <div className="space-y-6">
          {/* Timer */}
          <div className="text-center">
            <p
              className="font-mono text-4xl font-bold tabular-nums"
              style={{ color: timeLeft <= 30 ? '#ef4444' : 'var(--color-fg)' }}
            >
              {formatTime(timeLeft)}
            </p>
            <p className="mt-1 font-mono text-xs text-muted">Time remaining</p>
          </div>

          {/* Word card */}
          <div
            className="rounded-xl border-2 px-6 py-8 text-center"
            style={{
              borderColor: 'var(--color-accent)',
              background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
            }}
          >
            <p className="mb-2 font-mono text-xs text-muted">Your word</p>
            <p className="text-3xl font-bold text-fg">{myWord}</p>
          </div>

          <p
            className="rounded-lg px-3 py-2 text-center font-mono text-xs"
            style={{
              color: 'var(--color-muted)',
              background: 'color-mix(in srgb, var(--color-fg) 4%, transparent)',
            }}
          >
            Talk about your word without saying it directly!
          </p>

          {/* Player list */}
          <div>
            <p className="mb-2 font-mono text-xs text-muted">Players</p>
            <div className="flex flex-wrap gap-2">
              {playerList.map((p) => (
                <span
                  key={p.id}
                  className="rounded-lg border px-3 py-1.5 font-mono text-xs"
                  style={{
                    borderColor: border,
                    color: p.connected ? 'var(--color-fg)' : 'var(--color-muted)',
                    opacity: p.connected ? 1 : 0.5,
                  }}
                >
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Voting ── */}
      {screen === 'voting' && (
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-lg font-semibold text-fg">Vote</p>
            <p className="mt-1 font-mono text-xs text-muted">
              Vote for who you think is the wolf
            </p>
          </div>

          <div className="space-y-2">
            {playerList
              .filter((p) => p.id !== playerId)
              .map((p) => {
                const votes = voteCounts[p.id] ?? 0;
                const isSelected = selectedVote === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => castVote(p.id)}
                    disabled={hasVoted || !p.connected}
                    className="flex w-full items-center justify-between rounded-lg border px-4 py-3 font-mono text-sm transition-colors disabled:cursor-default"
                    style={{
                      borderColor: isSelected
                        ? 'var(--color-fg)'
                        : border,
                      background: isSelected
                        ? 'color-mix(in srgb, var(--color-fg) 8%, transparent)'
                        : 'transparent',
                      color: p.connected ? 'var(--color-fg)' : 'var(--color-muted)',
                    }}
                  >
                    <span>{p.name}</span>
                    {votes > 0 && (
                      <span className="rounded-full px-2 py-0.5 text-xs" style={{
                        background: 'color-mix(in srgb, var(--color-fg) 10%, transparent)',
                        color: 'var(--color-muted)',
                      }}>
                        {votes} {votes === 1 ? 'vote' : 'votes'}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>

          {hasVoted && (
            <div className="flex items-center justify-center gap-2 py-2">
              <div
                className="h-2 w-2 animate-pulse rounded-full"
                style={{ background: 'var(--color-muted)' }}
              />
              <p className="font-mono text-xs text-muted">Waiting for other players to vote...</p>
            </div>
          )}
        </div>
      )}

      {/* ── Result ── */}
      {screen === 'result' && resultData && (
        <div className="space-y-6">
          {/* Winner */}
          <div className="text-center">
            <p className="text-2xl font-bold text-fg">
              {resultData.winner === 'citizen' ? 'Citizens Win!' : 'Wolf Wins!'}
            </p>
          </div>

          {/* Wolf reveal */}
          <div
            className="rounded-xl border px-4 py-4 text-center"
            style={{
              borderColor: border,
              background: 'color-mix(in srgb, var(--color-fg) 4%, transparent)',
            }}
          >
            <p className="mb-3 font-mono text-xs text-muted">The wolf was...</p>
            <p className="text-xl font-bold text-fg">
              {players[resultData.wolfId]?.name ?? '???'}
            </p>
          </div>

          {/* Words */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded-lg border px-3 py-3 text-center"
              style={{ borderColor: border }}
            >
              <p className="mb-1 font-mono text-xs text-muted">Citizens&apos; word</p>
              <p className="text-lg font-bold text-fg">{resultData.citizenWord}</p>
            </div>
            <div
              className="rounded-lg border px-3 py-3 text-center"
              style={{ borderColor: border }}
            >
              <p className="mb-1 font-mono text-xs text-muted">Wolf&apos;s word</p>
              <p className="text-lg font-bold text-fg">{resultData.wolfWord}</p>
            </div>
          </div>

          {/* Vote breakdown */}
          <div>
            <p className="mb-2 font-mono text-xs text-muted">Vote results</p>
            <div className="space-y-1">
              {playerList.map((p) => {
                const votedFor = resultData.votes[p.id];
                const targetName = votedFor ? players[votedFor]?.name : '—';
                const receivedVotes = Object.values(resultData.votes).filter((v) => v === p.id).length;
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 font-mono text-xs"
                    style={{
                      borderColor: border,
                      background:
                        p.id === resultData.wolfId
                          ? 'color-mix(in srgb, #ef4444 8%, transparent)'
                          : 'transparent',
                    }}
                  >
                    <span className="text-fg">
                      {p.name}
                      {p.id === resultData.wolfId && (
                        <span className="ml-1.5" style={{ color: '#ef4444' }}>Wolf</span>
                      )}
                    </span>
                    <span className="text-muted">
                      → {targetName} ({receivedVotes} {receivedVotes === 1 ? 'vote' : 'votes'})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Wolf guess */}
          {resultData.canGuess && playerId === resultData.wolfId && !guessResult && (
            <div
              className="rounded-xl border px-4 py-4"
              style={{
                borderColor: 'var(--color-accent)',
                background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
              }}
            >
              <p className="mb-3 text-center font-mono text-xs text-muted">
                Last chance! Guess the citizens&apos; word to win
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitGuess()}
                  placeholder="Citizens' word is..."
                  className="flex-1 rounded-lg border bg-transparent px-3 py-2.5 font-mono text-base text-fg outline-none"
                  style={{ borderColor: border }}
                />
                <button
                  onClick={submitGuess}
                  className="rounded-lg px-4 py-2.5 font-mono text-sm font-medium transition-colors"
                  style={{ background: 'var(--color-fg)', color: 'var(--color-bg)' }}
                >
                  Guess
                </button>
              </div>
            </div>
          )}

          {/* Guess result */}
          {guessResult && (
            <p
              className="text-center font-mono text-sm font-bold"
              style={{ color: guessResult.correct ? '#22c55e' : '#ef4444' }}
            >
              {guessResult.correct ? 'Correct! Wolf wins by reversal!' : 'Wrong... Citizens win!'}
            </p>
          )}

          {/* Actions */}
          <div className="space-y-3 text-center">
            {isHost && (
              <button
                onClick={playAgain}
                className="w-full rounded-lg px-4 py-3 font-mono text-sm font-medium transition-colors"
                style={{ background: 'var(--color-fg)', color: 'var(--color-bg)' }}
              >
                Play Again
              </button>
            )}
            {!isHost && (
              <div className="flex items-center justify-center gap-2 py-2">
                <div
                  className="h-2 w-2 animate-pulse rounded-full"
                  style={{ background: 'var(--color-muted)' }}
                />
                <p className="font-mono text-xs text-muted">Waiting for the host to start the next game...</p>
              </div>
            )}
            <button
              onClick={backToLobby}
              className="font-mono text-xs text-muted transition-colors hover:text-fg"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
