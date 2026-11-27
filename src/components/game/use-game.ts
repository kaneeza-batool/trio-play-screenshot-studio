import { useCallback, useEffect, useRef, useState } from 'react';
import { demoPhase, demoState, gameRequest, gameSettings, getApiUrl, initialState, isGameState, type GameState } from '@/lib/game';

export function useGame(interval: number) {
  const [state, setState] = useState(initialState);
  const [connected, setConnected] = useState(false);
  const [demo, setDemo] = useState(false);
  const [settings, setSettings] = useState({ timer: 40, target: 15 });
  const [seconds, setSeconds] = useState(40);
  const deadline = useRef(0);
  const lastRound = useRef(-1);
  // Apps Script answers in 1.5-3s, so polls must never pile up behind each other,
  // and a poll that started before a local (host) change must not overwrite it.
  const inFlight = useRef(false);
  const localChangeAt = useRef(0);
  const refresh = useCallback(async (signal?: AbortSignal, force = false) => {
    if (!getApiUrl() || (inFlight.current && !force)) return;
    inFlight.current = true;
    const startedAt = Date.now();
    try {
      const result = await gameRequest({ action: 'state' }, signal);
      if (isGameState(result) && startedAt >= localChangeAt.current) { setState(result); setConnected(true); }
    } catch { /* Retain the last good state; the next poll retries. */ }
    finally { inFlight.current = false; }
  }, []);
  /** Show a state immediately (e.g. the expected result of a host command) until the next fresh poll. */
  const applyState = useCallback((next: GameState) => { localChangeAt.current = Date.now(); setState(next); }, []);
  useEffect(() => {
    const config = gameSettings(window.location.search);
    setSettings(config); setSeconds(config.timer);
    const phase = demoPhase(window.location.search);
    if (phase) { setDemo(true); setState(demoState(phase)); setConnected(true); return; }
    const controller = new AbortController();
    void refresh(controller.signal);
    // Skip polls while the tab is hidden (phones in pockets), which keeps Apps Script under its
    // concurrent-run limit; catch up immediately when the page is visible again.
    const id = window.setInterval(() => { if (!document.hidden) void refresh(controller.signal); }, interval);
    const onVisible = () => { if (!document.hidden) void refresh(controller.signal, true); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { controller.abort(); window.clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [interval, refresh]);
  useEffect(() => {
    if (state.round !== lastRound.current && state.round > 0) {
      lastRound.current = state.round;
      deadline.current = Date.now() + settings.timer * 1000;
      setSeconds(settings.timer);
    }
    if (state.phase === 'waiting') { lastRound.current = -1; deadline.current = 0; setSeconds(settings.timer); }
  }, [state.round, state.phase, settings.timer]);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (deadline.current && (state.phase === 'clue' || state.phase === 'hint')) setSeconds(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)));
    }, 250);
    return () => window.clearInterval(id);
  }, [state.phase]);
  return { state, connected, demo, settings, seconds, applyState, refresh: demo ? async () => {} : refresh };
}

export function usePlayAddress() {
  const [address, setAddress] = useState('/play');
  useEffect(() => setAddress(`${window.location.origin}/play`), []);
  return address;
}
