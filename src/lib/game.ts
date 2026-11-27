export type Phase = 'waiting' | 'clue' | 'hint' | 'reveal' | 'end';
export type Guess = { id: string | number; player: string; guess: string; message: string };
export type GameState = {
  round: number; phase: Phase; totalRounds: number; names: string[]; count: number;
  clue?: string; hint?: string; guesses?: Guess[];
  /** This round's 4 choices (1 correct + 3 wrong, already shuffled); sent during clue, hint and reveal. */
  options?: string[];
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
/** The live Google Apps Script backend shared by every attendee, screen and host. */
export const DEFAULT_GAME_API_URL = 'https://script.google.com/macros/s/AKfycbwH0yGsZ0iBCf9vf45ULiCBQD2Ei_n7f6_07gOAnY9lPFP8sWGvt8W2JibaIjoQt9ZP/exec';
export function getApiUrl() {
  const fromEnv = import.meta.env['VITE_GAME_API_URL'] as string | undefined;
  const fromHost = typeof localStorage !== 'undefined' ? localStorage.getItem('graduate-api-url') : null;
  return fromEnv || fromHost || DEFAULT_GAME_API_URL;
}
/** Apps Script normally answers in 1.5-3s; give up well before a stuck call freezes the page. */
export const REQUEST_TIMEOUT_MS = 12000;
export async function gameRequest(params: Record<string, string | number>, signal?: AbortSignal): Promise<unknown> {
  const base = getApiUrl();
  if (!base) throw new Error('The game connection is not ready yet. Please check with your host.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const forward = () => controller.abort();
  signal?.addEventListener('abort', forward, { once: true });
  let response: Response;
  try {
    response = await fetch(buildGameUrl(base, params), { signal: controller.signal });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new Error(controller.signal.aborted ? 'The game is taking too long to answer. Please try again.' : 'Could not reach the game. Check your connection and try again.');
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', forward); }
  if (!response.ok) throw new Error('Could not reach the game. Please try again.');
  let data: unknown;
  // When Google is overloaded it returns an HTML error page instead of JSON.
  try { data = await response.json(); } catch { throw new Error('The game is busy right now. Please try again in a moment.'); }
  if (data && typeof data === 'object' && 'error' in data) throw new Error(String(data.error));
  return data;
}
export function isGameState(data: unknown): data is GameState {
  if (!data || typeof data !== 'object') return false;
  return 'phase' in data && ['waiting','clue','hint','reveal','end'].includes(String(data.phase)) && 'round' in data && typeof data.round === 'number' && 'names' in data && Array.isArray(data.names) && 'leaderboard' in data && Array.isArray(data.leaderboard) && 'count' in data && typeof data.count === 'number';
}
/* ---------- Presentation rules shared by screen, player and host views ---------- */
export type Urgency = 'calm' | 'hurry' | 'final';
/** The timer turns urgent in the last 10 seconds and critical in the last 5. */
export function timerUrgency(seconds: number): Urgency { return seconds <= 5 ? 'final' : seconds <= 10 ? 'hurry' : 'calm'; }
export function initials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).map(part => [...part][0]).slice(0, 2).join('').toUpperCase() || '?';
}
/** A stable hue per name, so each person keeps the same avatar colour on every device. */
export function avatarHue(name: string) {
  let hue = 0;
  for (const char of name) hue = (hue * 31 + (char.codePointAt(0) ?? 0)) % 360;
  return hue;
}
export type TallyRow = { name: string; count: number; percent: number; correct: boolean };
/** How the crowd voted this round, most popular first. */
export function guessTally(guesses: Guess[] = [], answer?: string): TallyRow[] {
  const counts = new Map<string, number>();
  for (const g of guesses) if (g.guess) counts.set(g.guess, (counts.get(g.guess) ?? 0) + 1);
  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
  return [...counts].map(([name, count]) => ({ name, count, percent: total ? Math.round(count * 100 / total) : 0, correct: name === answer }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
export function findPlayer(leaderboard: GameState['leaderboard'], player: string) {
  const key = player.trim().toLowerCase();
  const index = leaderboard.findIndex(p => p.player.trim().toLowerCase() === key);
  return index < 0 ? null : { rank: index + 1, points: leaderboard[index]!.points };
}
/** Consecutive correct rounds ending at `upTo`. */
export function currentStreak(results: Record<string, boolean>, upTo: number) {
  let streak = 0;
  for (let round = upTo; round >= 1 && results[round]; round--) streak++;
  return streak;
}
export type HostCommand = 'start' | 'hint' | 'reveal' | 'next' | 'prev';
/** The button the host most likely wants next, so it can be highlighted. */
export function suggestedHostCommand(state: Pick<GameState, 'phase' | 'round' | 'totalRounds'>, ready: boolean): HostCommand | null {
  switch (state.phase) {
    case 'waiting': return 'start';
    case 'clue': return ready ? 'reveal' : 'hint';
    case 'hint': return 'reveal';
    case 'reveal': return 'next';
    default: return null;
  }
}

/* ---------- Demo mode: preview any phase with sample data via ?demo=<phase> ---------- */
const PHASES: Phase[] = ['waiting', 'clue', 'hint', 'reveal', 'end'];
export function demoPhase(search: string): Phase | null {
  const value = new URLSearchParams(search).get('demo');
  if (value === null) return null;
  return PHASES.includes(value as Phase) ? value as Phase : 'waiting';
}
export function demoState(phase: Phase): GameState {
  const names = ['Ayesha Khan', 'Sana Ali', 'Mahnoor Raza', 'Fatima Noor', 'Zara Ahmed', 'Hira Siddiqui'];
  const guesses: Guess[] = [
    { id: 1, player: 'Noor', guess: 'Sana Ali', message: 'So proud of you all! 🎓' },
    { id: 2, player: 'Ali', guess: 'Ayesha Khan', message: 'Data queens 👑' },
    { id: 3, player: 'Maryam', guess: 'Sana Ali', message: '' },
    { id: 4, player: 'Usman', guess: 'Sana Ali', message: 'You did it! 🚀' },
    { id: 5, player: 'Rida', guess: 'Fatima Noor', message: 'Next stop: the world 🌍' },
    { id: 6, player: 'Bilal', guess: 'Sana Ali', message: '' },
    { id: 7, player: 'Iqra', guess: 'Zara Ahmed', message: 'Brilliant women in AI 💜' },
  ];
  const leaderboard = [
    { player: 'Noor', points: 42 }, { player: 'Maryam', points: 35 }, { player: 'Usman', points: 31 },
    { player: 'Rida', points: 24 }, { player: 'Ali', points: 18 },
  ];
  const base: GameState = { round: 3, phase, totalRounds: 5, names, count: guesses.length, leaderboard, guesses,
    clue: 'She turned a spreadsheet of 10,000 rows into a dashboard the whole team now opens every morning.',
    hint: 'Her capstone was about predicting crop yields.',
    options: ['Zara Ahmed', 'Sana Ali', 'Hira Siddiqui', 'Ayesha Khan'] };
  if (phase === 'waiting') { const { clue: _clue, hint: _hint, options: _options, ...rest } = base; return { ...rest, round: 0, count: 0, guesses: [], leaderboard: [] }; }
  if (phase === 'reveal') return { ...base, reveal: { graduate: 'Sana Ali', cluster: 'Data Analytics Cluster', avatar: '', correct: 4, percent: 57, firstCorrect: 'Noor' } };
  if (phase === 'end') { const { options: _options, ...rest } = base; return { ...rest, round: 5 }; }
  return base;
}

/**
 * What the game will look like after a host command, so the host page can update instantly
 * while the (slow) Apps Script call is still in flight. The next poll replaces it with the real state.
 */
export function predictState(state: GameState, cmd: string): GameState {
  const clear = { count: 0, guesses: [] as Guess[] };
  switch (cmd) {
    case 'start': return { ...state, ...clear, round: 1, phase: 'clue' };
    case 'hint': return state.phase === 'clue' ? { ...state, phase: 'hint' } : state;
    case 'reveal': return state.phase === 'clue' || state.phase === 'hint' ? { ...state, phase: 'reveal' } : state;
    case 'next': return state.round >= state.totalRounds ? { ...state, phase: 'end' } : { ...state, ...clear, round: state.round + 1, phase: 'clue' };
    case 'prev': return state.round > 1 ? { ...state, ...clear, round: state.round - 1, phase: 'clue' } : state;
    case 'reset': return { ...state, ...clear, round: 0, phase: 'waiting', leaderboard: [] };
    default: return state;
  }
}

/** Host buttons that make sense right now, so a mis-tap can't restart or skip the game. */
export function hostCommandAllowed(state: Pick<GameState, 'phase' | 'round'>, cmd: HostCommand): boolean {
  const live = state.phase === 'clue' || state.phase === 'hint' || state.phase === 'reveal';
  switch (cmd) {
    case 'start': return state.phase === 'waiting';
    case 'hint': return state.phase === 'clue';
    case 'reveal': return state.phase === 'clue' || state.phase === 'hint';
    case 'next': return live;
    case 'prev': return live && state.round > 1;
  }
}
/** Player keys kept on this device for one game; cleared when the host resets. */
export function playerStorageKeys(keys: string[], player: string) {
  return keys.filter(k => k === `graduate-results:${player}` || k.startsWith(`graduate-locked:${player}:`) || k.startsWith(`graduate-pick:${player}:`));
}

/**
 * What a player picks from this round: the backend's shuffled options as cards, or, if an older
 * backend sends none, every name in a dropdown. Names are passed through unchanged so the
 * submitted guess matches the sheet's spelling exactly.
 */
export function guessChoices(state: Pick<GameState, 'options' | 'names'>): { mode: 'cards' | 'dropdown'; names: string[] } {
  const options = Array.isArray(state.options) ? state.options.filter(n => typeof n === 'string' && n !== '') : [];
  return options.length ? { mode: 'cards', names: options } : { mode: 'dropdown', names: state.names };
}
