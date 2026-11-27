import { describe, expect, it } from 'vitest';
import { avatarHue, currentStreak, demoPhase, demoState, findPlayer, guessTally, initials, isGameState, suggestedHostCommand, timerUrgency } from '@/lib/game';

describe('Presentation rules', () => {
  it('makes the timer urgent in the last 10 seconds and critical in the last 5', () => {
    expect(timerUrgency(11)).toBe('calm'); expect(timerUrgency(10)).toBe('hurry'); expect(timerUrgency(5)).toBe('final'); expect(timerUrgency(0)).toBe('final');
  });
  it('builds initials from up to two names', () => {
    expect(initials('Sana Ali')).toBe('SA'); expect(initials('  hira  bano siddiqui ')).toBe('HB'); expect(initials('')).toBe('?');
  });
  it('gives each name a stable avatar colour', () => { expect(avatarHue('Noor')).toBe(avatarHue('Noor')); expect(avatarHue('Noor')).toBeGreaterThanOrEqual(0); });
  it('tallies the crowd’s guesses, most popular first, and marks the answer', () => {
    const tally = guessTally([{ id: 1, player: 'a', guess: 'Sana', message: '' }, { id: 2, player: 'b', guess: 'Zara', message: '' }, { id: 3, player: 'c', guess: 'Sana', message: '' }, { id: 4, player: 'd', guess: '', message: 'hi' }], 'Zara');
    expect(tally).toEqual([{ name: 'Sana', count: 2, percent: 67, correct: false }, { name: 'Zara', count: 1, percent: 33, correct: true }]);
    expect(guessTally(undefined)).toEqual([]);
  });
  it('finds a player on the leaderboard regardless of case and spacing', () => {
    const board = [{ player: 'Noor', points: 30 }, { player: 'Ali', points: 10 }];
    expect(findPlayer(board, ' ali ')).toEqual({ rank: 2, points: 10 }); expect(findPlayer(board, 'Zed')).toBeNull();
  });
  it('counts consecutive correct rounds', () => {
    expect(currentStreak({ 1: true, 2: true, 3: true }, 3)).toBe(3);
    expect(currentStreak({ 1: true, 2: false, 3: true }, 3)).toBe(1);
    expect(currentStreak({ 1: true }, 2)).toBe(0);
  });
  it('suggests the host’s next step for each phase', () => {
    const at = (phase: 'waiting' | 'clue' | 'hint' | 'reveal' | 'end', ready = false) => suggestedHostCommand({ phase, round: 1, totalRounds: 5 }, ready);
    expect(at('waiting')).toBe('start'); expect(at('clue')).toBe('hint'); expect(at('clue', true)).toBe('reveal'); expect(at('hint')).toBe('reveal'); expect(at('reveal')).toBe('next'); expect(at('end')).toBeNull();
  });
  it('reads demo mode from the URL and only for known phases', () => {
    expect(demoPhase('')).toBeNull(); expect(demoPhase('?demo=reveal')).toBe('reveal'); expect(demoPhase('?demo')).toBe('waiting'); expect(demoPhase('?demo=nope')).toBe('waiting');
  });
  it('produces valid game states for every demo phase', () => {
    for (const phase of ['waiting', 'clue', 'hint', 'reveal', 'end'] as const) expect(isGameState(demoState(phase))).toBe(true);
    expect(demoState('reveal').reveal?.graduate).toBeTruthy();
  });
});

import { initialState, predictState } from '@/lib/game';
describe('Instant host feedback', () => {
  const live = { ...initialState, round: 2, phase: 'clue' as const, totalRounds: 3, count: 4 };
  it('starts at round 1 with a fresh clue', () => { expect(predictState(initialState, 'start')).toMatchObject({ round: 1, phase: 'clue', count: 0 }); });
  it('shows the hint, then the reveal', () => {
    expect(predictState(live, 'hint').phase).toBe('hint');
    expect(predictState({ ...live, phase: 'hint' }, 'reveal').phase).toBe('reveal');
  });
  it('moves to the next round, or to the end after the last one', () => {
    expect(predictState({ ...live, phase: 'reveal' }, 'next')).toMatchObject({ round: 3, phase: 'clue', count: 0 });
    expect(predictState({ ...live, round: 3, phase: 'reveal' }, 'next').phase).toBe('end');
  });
  it('goes back a round but never before round 1', () => {
    expect(predictState(live, 'prev').round).toBe(1);
    expect(predictState({ ...live, round: 1 }, 'prev').round).toBe(1);
  });
  it('resets everything', () => { expect(predictState(live, 'reset')).toMatchObject({ round: 0, phase: 'waiting', leaderboard: [] }); });
});
