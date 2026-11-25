export type Phase = 'waiting' | 'clue' | 'hint' | 'reveal' | 'end';
export type Guess = { id: string | number; player: string; guess: string; message: string };
export type GameState = {
  round: number; phase: Phase; totalRounds: number; names: string[]; count: number;
  clue?: string; hint?: string; guesses?: Guess[];
  reveal?: { graduate: string; cluster: string; avatar: string; correct: number; percent: number; firstCorrect: string };
  leaderboard: { player: string; points: number }[];
};
export const initialState: GameState = { round: 0, phase: 'waiting', totalRounds: 5, names: [], count: 0, leaderboard: [] };
export const MAX_MESSAGE_LENGTH = 80;
export const SCREEN_POLL_MS = 2000;
export const PLAY_POLL_MS = 4000;
export function gameSettings(search: string) {
  const params = new URLSearchParams(search);
  const numeric = (key: string, fallback: number) => {
    const value = Number(params.get(key));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
  };
  return { timer: numeric('timer', 40), target: numeric('target', 15) };
}
export function readyToReveal(seconds: number, count: number, target: number) { return seconds <= 0 || count >= target; }
export function buildGameUrl(base: string, params: Record<string, string | number>) {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  return url.toString();
}
export function getApiUrl() {
  return import.meta.env['VITE_GAME_API_URL'] as string | undefined || localStorage.getItem('graduate-api-url') || '';
}
export async function gameRequest(params: Record<string, string | number>, signal?: AbortSignal): Promise<unknown> {
  const base = getApiUrl();
  if (!base) throw new Error('The game connection is not ready yet. Please check with your host.');
  const response = await fetch(buildGameUrl(base, params), signal ? { signal } : {});
  if (!response.ok) throw new Error('Could not reach the game. Please try again.');
  const data: unknown = await response.json();
  if (data && typeof data === 'object' && 'error' in data) throw new Error(String(data.error));
  return data;
}
export function isGameState(data: unknown): data is GameState {
  if (!data || typeof data !== 'object') return false;
  return 'phase' in data && ['waiting','clue','hint','reveal','end'].includes(String(data.phase)) && 'round' in data && typeof data.round === 'number' && 'names' in data && Array.isArray(data.names) && 'leaderboard' in data && Array.isArray(data.leaderboard) && 'count' in data && typeof data.count === 'number';
}