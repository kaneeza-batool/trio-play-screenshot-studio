import { afterEach, describe, expect, it, vi } from 'vitest';
import { gameRequest, hostCommandAllowed, playerStorageKeys, REQUEST_TIMEOUT_MS } from '@/lib/game';

describe('Host buttons only work when they make sense', () => {
  const at = (phase: 'waiting' | 'clue' | 'hint' | 'reveal' | 'end', round = 2) => ({ phase, round });
  it('Start only before the game', () => { expect(hostCommandAllowed(at('waiting', 0), 'start')).toBe(true); expect(hostCommandAllowed(at('clue'), 'start')).toBe(false); });
  it('Hint only during the clue', () => { expect(hostCommandAllowed(at('clue'), 'hint')).toBe(true); expect(hostCommandAllowed(at('hint'), 'hint')).toBe(false); expect(hostCommandAllowed(at('reveal'), 'hint')).toBe(false); });
  it('Reveal only while guessing', () => { expect(hostCommandAllowed(at('hint'), 'reveal')).toBe(true); expect(hostCommandAllowed(at('reveal'), 'reveal')).toBe(false); });
  it('Next and Previous only during a game', () => {
    expect(hostCommandAllowed(at('reveal'), 'next')).toBe(true); expect(hostCommandAllowed(at('waiting', 0), 'next')).toBe(false); expect(hostCommandAllowed(at('end', 3), 'next')).toBe(false);
    expect(hostCommandAllowed(at('clue', 1), 'prev')).toBe(false); expect(hostCommandAllowed(at('clue', 2), 'prev')).toBe(true);
  });
});

describe('Player device storage', () => {
  it('finds only this player’s keys for one game', () => {
    const keys = ['graduate-player', 'graduate-locked:Noor:1', 'graduate-pick:Noor:1', 'graduate-results:Noor', 'graduate-locked:Noorain:1', 'graduate-host-pin'];
    expect(playerStorageKeys(keys, 'Noor').sort()).toEqual(['graduate-locked:Noor:1', 'graduate-pick:Noor:1', 'graduate-results:Noor']);
  });
});

describe('Talking to Apps Script', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
  it('explains a busy Google error page instead of a JSON parse error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Service unavailable</html>', { status: 200 })));
    await expect(gameRequest({ action: 'state' })).rejects.toThrow('The game is busy right now');
  });
  it('passes on the script’s own error message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: 'Wrong PIN' })));
    await expect(gameRequest({ action: 'host' })).rejects.toThrow('Wrong PIN');
  });
  it('gives up on a stuck request instead of hanging', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise((_, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))))));
    const pending = gameRequest({ action: 'state' });
    const check = expect(pending).rejects.toThrow('taking too long');
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 1);
    await check;
  });
});
