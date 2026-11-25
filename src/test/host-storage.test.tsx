import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HostPage } from '@/components/game/host';
import { initialState } from '@/lib/game';
vi.mock('@/components/game/use-game', () => ({
  useGame: () => ({ state: initialState, seconds: 40, connected: true, refresh: vi.fn() }),
}));
describe('Host PIN storage', () => {
  beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });
  afterEach(() => { cleanup(); sessionStorage.clear(); localStorage.clear(); });
  it('keeps the entered PIN in sessionStorage only', () => {
    render(<HostPage />);
    fireEvent.change(screen.getByLabelText('Your host PIN'), { target: { value: 'test-pin-only' } });
    fireEvent.click(screen.getByRole('button', { name: 'Open host controls' }));
    expect(sessionStorage.getItem('graduate-host-pin')).toBe('test-pin-only');
    expect(localStorage.getItem('graduate-host-pin')).toBeNull();
    expect(localStorage.length).toBe(0);
  });
});