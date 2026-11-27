import { useEffect, useState } from 'react';
import { Check, CheckCircle2, Flame, Hourglass, Lightbulb, LockKeyhole, PartyPopper, Sparkles, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { currentStreak, findPlayer, gameRequest, guessChoices, MAX_MESSAGE_LENGTH, PLAY_POLL_MS, playerStorageKeys } from '@/lib/game';
import { Avatar, BrandBar, Confetti, DemoBar, Footer, GraduationArt, RoundPips } from './brand';
import { ClueText, Countdown, Leaderboard } from './screen';
import { useGame } from './use-game';

const QUICK_CHEERS = ['Congrats! 🎓', 'So proud 💜', 'You did it! 🚀', 'Data queen 👑', 'The future is yours ✨'];

function readResults(player: string): Record<string, boolean> {
  try { return JSON.parse(sessionStorage.getItem(`graduate-results:${player}`) || '{}') as Record<string, boolean>; } catch { return {}; }
}

export function PlayerPage() {
  const { state, refresh, demo, seconds, settings } = useGame(PLAY_POLL_MS);
  const [player, setPlayer] = useState(''); const [draft, setDraft] = useState(''); const [loaded, setLoaded] = useState(false);
  const [guess, setGuess] = useState(''); const [message, setMessage] = useState('');
  const [lockedRound, setLockedRound] = useState<number | null>(null); const [pick, setPick] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [results, setResults] = useState<Record<string, boolean>>({});
  useEffect(() => { setPlayer(localStorage.getItem('graduate-player') || ''); setLoaded(true); }, []);
  useEffect(() => { setGuess(''); setMessage(''); setError(''); }, [state.round]);
  // TEMP: verify the backend's options on every poll (state is replaced on each successful poll).
  useEffect(() => { console.log(`[play] poll round ${state.round} (${state.phase}) options:`, state.options ?? '(none)', `| names: ${state.names.length}`); }, [state]);
  const choices = guessChoices(state);
  // Never submit a name that is no longer on offer (e.g. options arrived after a dropdown pick).
  useEffect(() => { if (guess && !choices.names.includes(guess)) setGuess(''); }, [choices.names, guess]);
  // A reset (or a rehearsal before the real game) must not leave rounds marked as already guessed.
  useEffect(() => {
    if (!player || state.phase !== 'waiting') return;
    for (const key of playerStorageKeys(Object.keys(sessionStorage), player)) sessionStorage.removeItem(key);
    setLockedRound(null); setPick(''); setResults({});
  }, [player, state.phase]);
  useEffect(() => {
    if (!player || state.round < 1) return;
    const key = `graduate-locked:${player}:${state.round}`;
    setLockedRound(sessionStorage.getItem(key) ? state.round : null);
    setPick(sessionStorage.getItem(`graduate-pick:${player}:${state.round}`) || '');
    setResults(readResults(player));
  }, [player, state.round]);
  // Score this round on this device once the answer is out, to drive the result card and streak.
  useEffect(() => {
    if (state.phase !== 'reveal' || !state.reveal || !pick || !player) return;
    const stored = readResults(player);
    if (state.round in stored) return;
    const next = { ...stored, [state.round]: pick === state.reveal.graduate };
    sessionStorage.setItem(`graduate-results:${player}`, JSON.stringify(next)); setResults(next);
  }, [state.phase, state.reveal, state.round, pick, player]);

  const lock = (chosen: string) => {
    setLockedRound(state.round); setPick(chosen);
    sessionStorage.setItem(`graduate-locked:${player}:${state.round}`, '1');
    sessionStorage.setItem(`graduate-pick:${player}:${state.round}`, chosen);
  };
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy || !guess) return; setBusy(true); setError('');
    try {
      if (!demo) {
        const result = await gameRequest({ action: 'guess', round: state.round, player, guess, message: message.slice(0, MAX_MESSAGE_LENGTH) });
        if (!result || typeof result !== 'object' || !('ok' in result) || result.ok !== true) throw new Error('Your guess could not be saved. Please try again.');
      }
      lock(guess); void refresh();
    } catch (e) { const text = e instanceof Error ? e.message : 'Please try again.'; if (/already.*guess/i.test(text)) lock(guess); else setError(text); } finally { setBusy(false); }
  }

  const active = state.phase === 'clue' || state.phase === 'hint';
  const me = player ? findPlayer(state.leaderboard, player) : null;
  const streak = currentStreak(results, state.phase === 'reveal' || state.phase === 'end' ? state.round : state.round - 1);
  const correct = state.reveal && pick ? pick === state.reveal.graduate : null;

  return <div className="game-shell player-shell">
    {demo && <DemoBar/>}
    <BrandBar/>
    <main className="mobile-content">
      <div className="eyebrow">THE GRADUATION GAME</div>
      <h1>Guess the Graduate<span className="brand-dot">.</span></h1>
      {!loaded ? <p>Getting ready…</p> : !player ? <section className="panel join-panel">
        <GraduationArt/>
        <h2>Hey, glad you’re here!</h2>
        <p className="text-muted-foreground">Read each clue, guess the graduate, and cheer them on.</p>
        <form onSubmit={e => { e.preventDefault(); if (draft.trim()) { localStorage.setItem('graduate-player', draft.trim()); setPlayer(draft.trim()); } }}>
          <div className="form-field"><label htmlFor="player-name">Your name</label><input className="field" id="player-name" required maxLength={60} autoComplete="given-name" value={draft} onChange={e => setDraft(e.target.value)} placeholder="What should we call you?"/></div>
          <Button variant="game" className="w-full" type="submit">Join the celebration <Sparkles/></Button>
        </form>
      </section> : <>
        <div className="player-card">
          <Avatar name={player} size={42}/>
          <div className="player-meta"><strong>{player}</strong><Button variant="link" className="change-name" onClick={() => { localStorage.removeItem('graduate-player'); setDraft(player); setPlayer(''); }}>Not you? Change name</Button></div>
          <div className="player-stats">
            <span title="Your points"><Trophy size={14}/>{me ? me.points : 0}</span>
            {me && <span title="Your rank">#{me.rank}</span>}
            {streak > 1 && <span className="streak" title="Correct in a row"><Flame size={14}/>{streak}</span>}
          </div>
        </div>
        {state.round > 0 && state.phase !== 'end' && <div className="phone-round"><RoundPips round={state.round} total={state.totalRounds}/><span className="eyebrow">ROUND {state.round} OF {state.totalRounds}</span></div>}

        {state.phase === 'waiting' && <section className="panel waiting-panel">
          <GraduationArt/>
          <h2>Get ready!</h2>
          <p>Guess the Graduate starts soon. Keep this page open.</p>
          <ol className="how-to compact"><li><span>1</span><div>Read the clue on the big screen</div></li><li><span>2</span><div>Tap the graduate you think it is</div></li><li><span>3</span><div>Fast, correct guesses climb the board</div></li></ol>
          <div className="waiting-dots" aria-label="Waiting for the host"><i/><i/><i/></div>
        </section>}

        {active && (lockedRound === state.round ? <section className="panel status-panel locked" aria-live="polite">
          <div className="lock-badge"><CheckCircle2 size={44}/></div>
          <h2>Guess locked!</h2>
          {pick && <p className="locked-pick">You picked <strong>{pick}</strong></p>}
          <p>Eyes on the screen 👀 The answer is coming.</p>
        </section> : <>
          <section className="panel clue-panel phone-clue">
            <div className="clue-top"><div className="eyebrow">THE CLUE</div><Countdown seconds={seconds} total={settings.timer} size="sm"/></div>
            {state.clue ? <ClueText text={state.clue} round={state.round}/> : <h2 className="clue-text">The clue is on the big screen…</h2>}
          </section>
          {state.phase === 'hint' && state.hint && <div className="hint"><Lightbulb size={20}/><div><span className="eyebrow">A LITTLE HINT</span><p>{state.hint}</p></div></div>}
          {seconds === 0 && <p className="times-up" role="status">⏰ Time’s up! Lock in your guess before the reveal.</p>}
          <form onSubmit={submit} className="guess-form">
            {choices.mode === 'cards' ? <div className="form-field">
              <span className="field-label" id="guess-label">Who is it?</span>
              <div className="option-grid" role="radiogroup" aria-labelledby="guess-label">
                {choices.names.map(n => <button type="button" role="radio" aria-checked={guess === n} key={n} className={`option-card${guess === n ? ' selected' : ''}`} onClick={() => setGuess(n)}>
                  <span>{n}</span>{guess === n && <Check className="option-check" size={18} aria-hidden="true"/>}
                </button>)}
              </div>
            </div> : <div className="form-field">
              <label htmlFor="graduate-guess">Who is it?</label>
              <select className="field" id="graduate-guess" required value={guess} onChange={e => setGuess(e.target.value)}>
                <option value="" disabled>Choose a graduate</option>
                {choices.names.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>}
            <div className="form-field">
              <label htmlFor="cheer-message"><span>Send a cheer <span className="text-muted-foreground font-normal">(optional)</span></span><span className="text-muted-foreground font-normal">{message.length}/{MAX_MESSAGE_LENGTH}</span></label>
              <div className="quick-cheers">{QUICK_CHEERS.map(c => <button type="button" key={c} className={message === c ? 'on' : ''} onClick={() => setMessage(m => m === c ? '' : c)}>{c}</button>)}</div>
              <input className="field" id="cheer-message" maxLength={MAX_MESSAGE_LENGTH} value={message} onChange={e => setMessage(e.target.value)} placeholder="Or write your own 💜"/>
            </div>
            {error && <p className="error-note" role="alert">{error}</p>}
            <div className="lock-bar"><Button type="submit" variant="game" className="w-full" disabled={busy || !guess}><LockKeyhole/>{busy ? 'Locking…' : 'Lock my guess'}</Button></div>
          </form>
        </>)}

        {state.phase === 'reveal' && (correct === true ? <section className="panel status-panel result-win" aria-live="polite">
          <Confetti pieces={30}/>
          <PartyPopper size={48}/><h2>You got it! 🎉</h2>
          <p>It was <strong>{state.reveal?.graduate}</strong>.{streak > 1 && <> That’s <strong>{streak} in a row</strong> 🔥</>}</p>
        </section> : correct === false ? <section className="panel status-panel result-miss" aria-live="polite">
          <Sparkles size={44}/><h2>So close!</h2>
          <p>You picked {pick}, but it was <strong>{state.reveal?.graduate}</strong>. Next round is yours.</p>
        </section> : <section className="panel status-panel" aria-live="polite">
          <Hourglass size={44}/><h2>Answer revealed!</h2>
          <p>{state.reveal ? <>It was <strong>{state.reveal.graduate}</strong>. Look at the screen 🎉</> : 'Look at the screen 🎉'}</p>
        </section>)}

        {state.phase === 'end' && <>
          <section className="panel status-panel result-win"><Confetti pieces={30}/><Trophy size={44}/><h2>Thanks for playing! 💜</h2><p>{me ? <>You finished <strong>#{me.rank}</strong> with <strong>{me.points} points</strong>.</> : 'Here’s to our brilliant graduates.'}</p></section>
          <Leaderboard state={state} compact highlight={player}/>
        </>}
      </>}
    </main>
    <Footer/>
  </div>;
}
