export interface Player {
  id: string;
  name: string;
  connected: boolean;
}

export interface GameState {
  phase: "lobby" | "playing" | "voting" | "result";
  players: Record<string, Player>;
  hostId: string | null;
  citizenWord: string | null;
  wolfWord: string | null;
  wolfId: string | null;
  votes: Record<string, string>; // voterId → targetId
  discussionEndTime: number | null;
  wolfGuessed: boolean;
  winner: "citizen" | "wolf" | null;
}

// Client → Server
export type ClientMessage =
  | { type: "join"; name: string }
  | { type: "start" }
  | { type: "vote"; targetId: string }
  | { type: "guess"; word: string }
  | { type: "play_again" };

// Server → Client
export type ServerMessage =
  | { type: "joined"; playerId: string; players: Record<string, Player>; isHost: boolean; hostId: string }
  | { type: "player_joined"; players: Record<string, Player>; hostId: string }
  | { type: "player_left"; players: Record<string, Player>; hostId: string }
  | { type: "game_started"; word: string; phase: "playing"; endTime: number; players: Record<string, Player> }
  | { type: "phase_changed"; phase: "voting" }
  | { type: "vote_update"; voteCount: Record<string, number> }
  | {
      type: "result";
      wolfId: string;
      wolfWord: string;
      citizenWord: string;
      votes: Record<string, string>;
      winner: "citizen" | "wolf";
      canGuess: boolean;
    }
  | { type: "guess_result"; correct: boolean; winner: "citizen" | "wolf" }
  | { type: "returned_to_lobby"; players: Record<string, Player>; hostId: string }
  | { type: "error"; message: string };

export interface Env {
  GAME_ROOM: DurableObjectNamespace;
}
