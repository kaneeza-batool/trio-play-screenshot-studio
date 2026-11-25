import { useCallback, useEffect, useRef, useState } from 'react';
import { gameRequest, gameSettings, getApiUrl, initialState, isGameState } from '@/lib/game';

export function useGame(interval: number) {
  const [state, setState] = useState(initialState);
  const [connected, setConnected] = useState(false);
  const [settings, setSettings] = useState({ timer: 40, target: 15 });
  const [seconds, setSeconds] = useState(40);
  const deadline = useRef(0);
  const lastRound = useRef(-1);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      if (!getApiUrl()) return;
      const result = await gameRequest({ action: 'state' }, signal);
      if (isGameState(result)) { setState(result); setConnected(true); }
    } catch { /* Retain the last good state; the next poll retries. */ }
  }, []);
  useEffect(() => {
    const config = gameSettings(window.location.search);
    setSettings(config); setSeconds(config.timer);
    const controller = new AbortController();
    void refresh(controller.signal);
    const id = window.setInterval(() => void refresh(controller.signal), interval);
    return () => { controller.abort(); window.clearInterval(id); };
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
  return { state, connected, settings, seconds, refresh };
}

export function usePlayAddress() {
  const [address, setAddress] = useState('/play');
  useEffect(() => setAddress(`${window.location.origin}/play`), []);
  return address;
}
