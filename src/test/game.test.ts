import { describe, expect, it } from 'vitest';
import { buildGameUrl, gameSettings, MAX_MESSAGE_LENGTH, PLAY_POLL_MS, readyToReveal, SCREEN_POLL_MS } from '@/lib/game';
describe('Game rules', () => {
  it('limits cheer messages to 80 characters', () => { expect(MAX_MESSAGE_LENGTH).toBe(80); });
  it('defaults to a 40 second timer', () => { expect(gameSettings('').timer).toBe(40); });
  it('defaults to a target of 15 guesses', () => { expect(gameSettings('').target).toBe(15); });
  it('allows the timer to be set by the screen URL', () => { expect(gameSettings('?timer=60').timer).toBe(60); });
  it('allows the target to be set by the screen URL', () => { expect(gameSettings('?target=25').target).toBe(25); });
  it('is ready when the timer ends but not before', () => { expect(readyToReveal(0,0,15)).toBe(true); expect(readyToReveal(1,0,15)).toBe(false); });
  it('is ready when the target is reached but not before', () => { expect(readyToReveal(20,15,15)).toBe(true); expect(readyToReveal(20,14,15)).toBe(false); });
  it('polls attendee state every 4 seconds', () => { expect(PLAY_POLL_MS).toBe(4000); });
  it('polls screen and host state every 2 seconds', () => { expect(SCREEN_POLL_MS).toBe(2000); });
  it('encodes guess names and cheer messages without altering them', () => {
    const url = new URL(buildGameUrl('https://script.google.com/macros/s/example/exec',{action:'guess',round:2,player:'Ayesha & Noor',guess:'Sana Ali',message:'Love + cheers! 💜'}));
    expect(url.searchParams.get('player')).toBe('Ayesha & Noor'); expect(url.searchParams.get('message')).toBe('Love + cheers! 💜'); expect(url.searchParams.get('round')).toBe('2');
  });
});