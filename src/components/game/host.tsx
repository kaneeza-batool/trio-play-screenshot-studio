import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Lightbulb, Play, RotateCcw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { gameRequest, type GameState, getApiUrl, type HostCommand, hostCommandAllowed, isGameState, predictState, readyToReveal, SCREEN_POLL_MS, suggestedHostCommand } from '@/lib/game';
import { Avatar, BrandBar, Footer, RoundPips } from './brand';
import { useGame } from './use-game';

const ACTIONS: { cmd: HostCommand; label: string; icon: typeof Play }[] = [
  { cmd: 'start', label: 'Start game', icon: Play }, { cmd: 'hint', label: 'Show hint', icon: Lightbulb }, { cmd: 'reveal', label: 'Reveal', icon: Eye },
  { cmd: 'next', label: 'Next round', icon: ChevronRight }, { cmd: 'prev', label: 'Previous', icon: ChevronLeft },
];

export function HostPage() {
  const { state, seconds, refresh, connected, settings, applyState } = useGame(SCREEN_POLL_MS);
  const [pin, setPin] = useState(''); const [draft, setDraft] = useState(''); const [api, setApi] = useState(''); const [error, setError] = useState(''); const [pending, setPending] = useState<string | null>(null); const [resetConfirm, setResetConfirm] = useState(false);
  const busy = pending !== null;
  useEffect(() => { setPin(sessionStorage.getItem('graduate-host-pin') || ''); setApi(getApiUrl()); }, []);
  // Apps Script takes 1.5-3s per call, so show the expected result straight away and confirm in the background.
  async function command(cmd: string, id?: string | number) {
    if (busy) return; setPending(cmd); setError('');
    const before = state;
    const expected: GameState = cmd === 'hide' ? { ...state, guesses: (state.guesses ?? []).filter(g => g.id !== id) } : predictState(state, cmd);
    applyState?.(expected);
    if (cmd === 'reset') setResetConfirm(false);
    try {
      const data = await gameRequest({ action: 'host', pin, cmd, ...(id !== undefined ? { id } : {}) });
      if (!data || typeof data !== 'object' || !('ok' in data) || data.ok !== true) throw new Error('The command was not confirmed. Please try again.');
      const confirmed = 'state' in data && isGameState(data.state) ? data.state : isGameState(data) ? data : null;
      applyState?.(confirmed ?? expected); // discard any poll that started before the command landed
      void refresh(undefined, true);
    } catch (e) {
      applyState?.(before);
      const text = e instanceof Error ? e.message : 'Please try again.';
      setError(/pin/i.test(text) ? 'That PIN was not accepted. Tap “Change PIN” above and enter the host PIN from your Apps Script.' : text);
    } finally { setPending(null); }
  }
  const target = settings?.target ?? 15;
  const suggested = suggestedHostCommand(state, readyToReveal(seconds, state.count, target));
  const cheers = state.guesses?.filter(g => g.message) ?? [];
  const lastRound = state.round >= state.totalRounds;
  return <div className="game-shell"><BrandBar/><main className="host-content">
    <div className="eyebrow">HOST’S DESK</div><h1>Let’s celebrate our graduates.</h1>
    {!pin ? <section className="panel">
      <ShieldCheck className="text-primary" size={32}/><h2 className="panel-title">Host access</h2>
      <form onSubmit={e => { e.preventDefault(); if (draft.trim()) { sessionStorage.setItem('graduate-host-pin', draft.trim()); setPin(draft.trim()); setDraft(''); } }}>
        <div className="form-field"><label htmlFor="host-pin">Your host PIN</label><input className="field" id="host-pin" value={draft} onChange={e => setDraft(e.target.value)} type="password" autoComplete="off" required/></div>
        <Button type="submit" variant="game" className="w-full">Open host controls</Button>
      </form>
    </section> : <>
      <div className="player-line"><span><ShieldCheck size={14} className="inline text-primary"/> Private host controls</span><Button variant="link" onClick={() => { sessionStorage.removeItem('graduate-host-pin'); setPin(''); }}>Change PIN</Button></div>
      {!connected && <details className="panel"><summary className="cursor-pointer panel-title font-bold">Connect your game</summary><form onSubmit={e => { e.preventDefault(); try { const url = new URL(api); if (url.protocol !== 'https:') throw new Error(); localStorage.setItem('graduate-api-url', url.toString()); setError(''); void refresh(); } catch { setError('Please enter a valid HTTPS web app URL.'); } }}><div className="form-field"><label htmlFor="api-url">Google Apps Script /exec URL</label><input id="api-url" type="url" className="field" value={api} onChange={e => setApi(e.target.value)} required placeholder="https://script.google.com/macros/s/…/exec"/></div><Button variant="game" type="submit">Connect</Button><p className="connection-note">The game is already connected to its live backend. Use this only to point this browser at a different web app.</p></form></details>}
      <div className="host-stats">
        <div><div className="eyebrow">ROUND</div><strong>{state.round} / {state.totalRounds}</strong>{state.round > 0 && <RoundPips round={state.round} total={state.totalRounds}/>}</div>
        <div><div className="eyebrow">PHASE</div><strong className="capitalize">{state.phase}</strong></div>
        <div><div className="eyebrow">GUESSES</div><strong>{state.count}<small> / {target}</small></strong></div>
        <div><div className="eyebrow">TIMER</div><strong className={seconds <= 10 && (state.phase === 'clue' || state.phase === 'hint') ? 'text-destructive' : ''}>{seconds}s</strong></div>
      </div>
      {suggested && <p className="host-tip">Up next: <strong>{suggested === 'next' && lastRound ? 'Finish game' : ACTIONS.find(a => a.cmd === suggested)?.label}</strong></p>}
      <div className="host-actions">{ACTIONS.map(({ cmd, label, icon: Icon }) => <Button key={cmd} variant={cmd === suggested ? 'game' : 'outline'} className={cmd === suggested ? 'suggested' : ''} disabled={busy || !hostCommandAllowed(state, cmd)} onClick={() => void command(cmd)}><Icon/>{pending === cmd ? 'Sending…' : cmd === 'next' && lastRound ? 'Finish game' : label}</Button>)}<Button variant="outline" disabled={busy} onClick={() => setResetConfirm(true)}><RotateCcw/>Reset game</Button></div>
      {error && <p className="error-note" role="alert">{error}</p>}
      {resetConfirm && <section className="panel mt-5" role="alertdialog" aria-modal="true" aria-labelledby="reset-title"><h2 id="reset-title" className="panel-title">Reset the entire game?</h2><p>This clears the current game and scores.</p><div className="flex gap-3"><Button variant="destructive" disabled={busy} onClick={() => void command('reset')}>Yes, reset game</Button><Button variant="outline" onClick={() => setResetConfirm(false)}>Cancel</Button></div></section>}
      <h2 className="panel-title text-lg mt-8">Live cheers <span className="text-muted-foreground text-sm">({cheers.length})</span></h2>
      {cheers.map(g => <div className="host-cheer" key={g.id}><Avatar name={g.player} size={32}/><p><strong>{g.player}</strong><br/>{g.message}</p><Button variant="outline" disabled={busy} onClick={() => void command('hide', g.id)}><EyeOff/>Hide</Button></div>)}
      {!cheers.length && <p className="text-muted-foreground text-sm">The first cheers will appear here.</p>}
    </>}
  </main><Footer/></div>;
}
