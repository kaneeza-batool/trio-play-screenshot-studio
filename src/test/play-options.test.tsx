import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { guessChoices, initialState, type GameState } from '@/lib/game';

const game = vi.hoisted(() => ({ state: null as unknown as GameState }));
const request = vi.hoisted(() => vi.fn(async (_params: Record<string, string | number>) => ({ ok: true })));

vi.mock('@/components/game/use-game', () => ({
  useGame: () => ({ state: game.state, demo: false, seconds: 30, settings: { timer: 40, target: 15 }, refresh: vi.fn() }),
}));
vi.mock('@/lib/game', async importOriginal => ({ ...(await importOriginal<typeof import('@/lib/game')>()), gameRequest: request }));

import { PlayerPage } from '@/components/game/play';

const OPTIONS = ['Tooba Sehar', 'Aimen Fatima', 'Ayesha Farooq', 'Hira Siddiqui'];
const round = (n: number, extra: Partial<GameState> = {}): GameState => ({
  ...initialState, round: n, phase: 'clue', totalRounds: 3, clue: 'A clue', names: ['Aimen Fatima', 'Tooba Sehar', 'Ayesha Farooq'], options: OPTIONS, ...extra,
});

describe('Round options rule', () => {
  it('uses the backend options as cards, unchanged and in order', () => {
    expect(guessChoices({ names: ['x'], options: OPTIONS })).toEqual({ mode: 'cards', names: OPTIONS });
  });
  it('falls back to a dropdown of every name when options are missing or empty', () => {
    expect(guessChoices({ names: ['A', 'B'] })).toEqual({ mode: 'dropdown', names: ['A', 'B'] });
    expect(guessChoices({ names: ['A', 'B'], options: [] })).toEqual({ mode: 'dropdown', names: ['A', 'B'] });
  });
});

describe('Player page guessing', () => {
  beforeEach(() => { localStorage.setItem('graduate-player', 'Noor'); request.mockClear(); });
  afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear(); });

  it('shows the 4 options as cards and keeps the lock button disabled until one is picked', () => {
    game.state = round(1);
    render(<PlayerPage/>);
    const cards = screen.getAllByRole('radio');
    expect(cards.map(c => c.textContent)).toEqual(OPTIONS);
    const lock = screen.getByRole('button', { name: /lock my guess/i });
    expect(lock).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: 'Ayesha Farooq' }));
    expect(screen.getByRole('radio', { name: 'Ayesha Farooq' })).toHaveAttribute('aria-checked', 'true');
    expect(lock).toBeEnabled();
  });

  it('submits the picked name exactly as the backend spelled it', async () => {
    game.state = round(2);
    render(<PlayerPage/>);
    fireEvent.click(screen.getByRole('radio', { name: 'Tooba Sehar' }));
    fireEvent.click(screen.getByRole('button', { name: /lock my guess/i }));
    await waitFor(() => expect(request).toHaveBeenCalledWith(expect.objectContaining({ action: 'guess', round: 2, guess: 'Tooba Sehar', player: 'Noor' })));
  });

  it('falls back to the dropdown of names when the backend sends no options', () => {
    game.state = round(1, { options: [] });
    render(<PlayerPage/>);
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    const select = screen.getByLabelText('Who is it?');
    expect(Array.from((select as HTMLSelectElement).options).map(o => o.value)).toEqual(['', 'Aimen Fatima', 'Tooba Sehar', 'Ayesha Farooq']);
    expect(screen.getByRole('button', { name: /lock my guess/i })).toBeDisabled();
  });

  it('clears the selection when the round changes', () => {
    game.state = round(1);
    const { rerender } = render(<PlayerPage/>);
    fireEvent.click(screen.getByRole('radio', { name: 'Aimen Fatima' }));
    expect(screen.getByRole('button', { name: /lock my guess/i })).toBeEnabled();
    game.state = round(2);
    rerender(<PlayerPage/>);
    expect(screen.getAllByRole('radio').every(c => c.getAttribute('aria-checked') === 'false')).toBe(true);
    expect(screen.getByRole('button', { name: /lock my guess/i })).toBeDisabled();
  });
});
