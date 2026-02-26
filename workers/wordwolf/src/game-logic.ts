import type { GameState, Player } from "./types";
import { pickRandomPair } from "./words";

const DISCUSSION_DURATION_MS = 3 * 60 * 1000; // 3 minutes
const MAX_PLAYERS = 8;

export function createInitialState(): GameState {
  return {
    phase: "lobby",
    players: {},
    hostId: null,
    citizenWord: null,
    wolfWord: null,
    wolfId: null,
    votes: {},
    discussionEndTime: null,
    wolfGuessed: false,
    winner: null,
  };
}

export function addPlayer(state: GameState, id: string, name: string): GameState | null {
  if (state.phase !== "lobby") return null;
  if (Object.keys(state.players).length >= MAX_PLAYERS) return null;
  if (state.players[id]) return null;

  const player: Player = { id, name, connected: true };
  const players = { ...state.players, [id]: player };
  const hostId = state.hostId ?? id;

  return { ...state, players, hostId };
}

export function removePlayer(state: GameState, id: string): GameState {
  const { [id]: _, ...remainingPlayers } = state.players;

  // Transfer host if needed
  let hostId = state.hostId;
  if (hostId === id) {
    const connected = Object.values(remainingPlayers).find((p) => p.connected);
    hostId = connected?.id ?? null;
  }

  return { ...state, players: remainingPlayers, hostId };
}

export function disconnectPlayer(state: GameState, id: string): GameState {
  if (!state.players[id]) return state;
  const players = {
    ...state.players,
    [id]: { ...state.players[id], connected: false },
  };

  let hostId = state.hostId;
  if (hostId === id) {
    const connected = Object.values(players).find((p) => p.connected);
    hostId = connected?.id ?? null;
  }

  return { ...state, players, hostId };
}

export function connectedCount(state: GameState): number {
  return Object.values(state.players).filter((p) => p.connected).length;
}

export function startGame(state: GameState, hostId: string): GameState | null {
  if (state.phase !== "lobby") return null;
  if (state.hostId !== hostId) return null;

  const playerIds = Object.keys(state.players);
  if (playerIds.length < 3) return null;

  const [citizenWord, wolfWord] = pickRandomPair();
  const wolfIndex = Math.floor(Math.random() * playerIds.length);
  const wolfId = playerIds[wolfIndex];
  const endTime = Date.now() + DISCUSSION_DURATION_MS;

  return {
    ...state,
    phase: "playing",
    citizenWord,
    wolfWord,
    wolfId,
    votes: {},
    discussionEndTime: endTime,
    wolfGuessed: false,
    winner: null,
  };
}

export function getWordForPlayer(state: GameState, playerId: string): string | null {
  if (!state.citizenWord || !state.wolfWord || !state.wolfId) return null;
  return playerId === state.wolfId ? state.wolfWord : state.citizenWord;
}

export function transitionToVoting(state: GameState): GameState {
  if (state.phase !== "playing") return state;
  return { ...state, phase: "voting", votes: {}, discussionEndTime: null };
}

export function castVote(state: GameState, voterId: string, targetId: string): GameState | null {
  if (state.phase !== "voting") return null;
  if (!state.players[voterId] || !state.players[targetId]) return null;
  if (voterId === targetId) return null;
  if (state.votes[voterId]) return null; // Already voted

  const votes = { ...state.votes, [voterId]: targetId };
  return { ...state, votes };
}

export function getVoteCounts(state: GameState): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const id of Object.keys(state.players)) {
    counts[id] = 0;
  }
  for (const targetId of Object.values(state.votes)) {
    counts[targetId] = (counts[targetId] ?? 0) + 1;
  }
  return counts;
}

export function allVotesIn(state: GameState): boolean {
  const connectedPlayers = Object.values(state.players).filter((p) => p.connected);
  return connectedPlayers.every((p) => state.votes[p.id] !== undefined);
}

export function tallyVotes(state: GameState): GameState {
  if (state.phase !== "voting") return state;

  const counts = getVoteCounts(state);
  const maxVotes = Math.max(...Object.values(counts));
  const mostVoted = Object.entries(counts).filter(([, v]) => v === maxVotes);

  // Wolf caught: single most-voted player is the wolf
  const wolfCaught = mostVoted.length === 1 && mostVoted[0][0] === state.wolfId;
  const winner = wolfCaught ? "citizen" : "wolf";

  return {
    ...state,
    phase: "result",
    winner,
    wolfGuessed: false,
  };
}

export function wolfGuess(state: GameState, word: string): GameState | null {
  if (state.phase !== "result") return null;
  if (state.winner !== "citizen") return null;
  if (state.wolfGuessed) return null;

  const correct = word.trim().toLowerCase() === state.citizenWord?.trim().toLowerCase();
  const winner = correct ? "wolf" : "citizen";

  return { ...state, wolfGuessed: true, winner };
}

export function returnToLobby(state: GameState): GameState {
  return {
    ...state,
    phase: "lobby",
    citizenWord: null,
    wolfWord: null,
    wolfId: null,
    votes: {},
    discussionEndTime: null,
    wolfGuessed: false,
    winner: null,
  };
}
