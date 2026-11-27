import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowUpRight, Crown, Heart, Lightbulb, MessageCircleHeart, Radio, ScanLine, Sparkles, Trophy, Users, Volume2, VolumeX, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type GameState, guessTally, initials, readyToReveal, SCREEN_POLL_MS, timerUrgency } from '@/lib/game';
import { Avatar, BrandBar, Confetti, DemoBar, Footer, GraduationArt, RoundPips } from './brand';
import { useGame, usePlayAddress } from './use-game';

const MEDALS = ['🥇', '🥈', '🥉'];

export function Leaderboard({ state, compact = false, highlight }: { state: GameState; compact?: boolean; highlight?: string }) {
  const top = state.leaderboard.slice(0, 5);
  const best = Math.max(1, ...top.map(p => p.points));
  return <aside className={compact ? 'panel leaderboard' : 'sidebar leaderboard'}>
    <div className="sidebar-title"><span>LEADERBOARD</span><Trophy size={17}/></div>
    {top.length ? <ol className="leader-list">{top.map((p, i) => <li className={`leader-row${highlight && p.player.trim().toLowerCase() === highlight.trim().toLowerCase() ? ' is-me' : ''}`} key={`${p.player}-${i}`} style={{ animationDelay: `${i * 80}ms` }}>
      <span className={`rank rank-${i + 1}`}>{i < 3 ? MEDALS[i] : i + 1}</span>
      <Avatar name={p.player} size={30}/>
      <span className="leader-body"><span className="leader-name">{p.player}</span><span className="leader-bar"><span style={{ width: `${(p.points / best) * 100}%` }}/></span></span>
      <span className="leader-points">{p.points}<small>pts</small></span>
    </li>)}</ol> : <div className="leader-empty"><div className="trophy-disc"><Trophy size={28}/></div><h3>A little friendly competition</h3><p>The leaderboard is waiting for its first stars.</p></div>}
    <div className="leader-note"><Zap size={12}/>Right answers score · fast ones shine</div>
  </aside>;
}

function Welcome({ address }: { address: string }) {
  return <>
    <section className="hero">
      <div className="hero-copy">
        <div className="eyebrow">A celebration of our graduating stars</div>
        <h2>Big dreams.<br/>Brilliant women.<br/><span className="gradient-text">Who’s behind the clue?</span></h2>
        <p>A little mystery. A lot of celebration.</p>
      </div>
      <GraduationArt/>
    </section>
    <section className="join-section">
      <div className="join-copy">
        <div className="eyebrow">YOU’RE INVITED TO PLAY</div>
        <h3>Grab your phone and open</h3>
        <Link to="/play" className="play-address">{address.replace(/^https?:\/\//, '')} <ArrowUpRight size={18} className="inline"/></Link>
        {/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/)/.test(address) && <p className="local-warning" role="note">This screen is running on this computer only, so phones can’t open this link. Open the published game link on the projector instead.</p>}
        <ol className="how-to">
          <li><span><ScanLine size={18}/></span><div><strong>Scan &amp; join</strong>No app, just your name</div></li>
          <li><span><Lightbulb size={18}/></span><div><strong>Read the clue</strong>Tap who you think it is</div></li>
          <li><span><MessageCircleHeart size={18}/></span><div><strong>Cheer &amp; climb</strong>Send love, top the board</div></li>
        </ol>
      </div>
      <div className="qr-frame"><QRCodeSVG value={address} size={148} level="M"/><span>SCAN TO JOIN</span></div>
    </section>
  </>;
}

export function Countdown({ seconds, total, size = 'lg' }: { seconds: number; total: number; size?: 'lg' | 'sm' }) {
  const urgency = timerUrgency(seconds);
  return <div className={`timer timer-${size} timer-${urgency}`} role="timer" aria-label={`${seconds} seconds remaining`}>
    <svg viewBox="0 0 80 80"><defs><linearGradient id={`countdown-${size}`}><stop stopColor="var(--green)"/><stop offset="1" stopColor="var(--magenta)"/></linearGradient></defs><circle className="timer-track" cx="40" cy="40" r="34" fill="none" strokeWidth="6"/><circle className="timer-arc" cx="40" cy="40" r="34" fill="none" stroke={urgency === 'calm' ? `url(#countdown-${size})` : 'var(--destructive)'} strokeWidth="6" strokeLinecap="round" strokeDasharray="213.6" strokeDashoffset={213.6 * (1 - seconds / Math.max(1, total))}/></svg>
    <span>{seconds}</span>
  </div>;
}

/** The clue fades in word by word, like it is being read aloud. */
export function ClueText({ text, round }: { text: string; round: number }) {
  return <h2 className="clue-text" key={`${round}-${text}`}>{text.split(/\s+/).map((word, i) => <span key={i} style={{ animationDelay: `${i * 70}ms` }}>{word} </span>)}</h2>;
}

function GuessMeter({ count, target }: { count: number; target: number }) {
  const percent = Math.min(100, (count / Math.max(1, target)) * 100);
  return <div className="meter" aria-label={`${count} of ${target} guesses`}>
    <div className="meter-head"><span><Users size={15}/> <strong>{count}</strong> guesses in</span><span className="text-muted-foreground">goal {target}</span></div>
    <div className="meter-track"><div className="meter-fill" style={{ width: `${percent}%` }}/></div>
  </div>;
}

function CheerWall({ state }: { state: GameState }) {
  const cheers = (state.guesses ?? []).filter(g => g.message);
  if (!cheers.length) return <p className="cheer-empty"><Heart size={14}/> Cheers from the audience will float up here</p>;
  return <div className="cheers">{cheers.slice(-8).map(g => <div className="cheer" key={g.id}><Avatar name={g.player} size={26}/><span><strong>{g.player}</strong> {g.message}</span></div>)}</div>;
}

/** Spins through every name like a slot machine before the real answer lands. */
function NameRoulette({ names }: { names: string[] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => { const id = window.setInterval(() => setIndex(i => i + 1), 85); return () => window.clearInterval(id); }, []);
  const pool = names.length ? names : ['…'];
  return <div className="roulette" aria-hidden="true"><span key={index}>{pool[index % pool.length]}</span></div>;
}

function Reveal({ state }: { state: GameState }) {
  const [ready, setReady] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  useEffect(() => { setReady(false); setAvatarFailed(false); const id = window.setTimeout(() => setReady(true), 2200); return () => window.clearTimeout(id); }, [state.round]);
  const answer = state.reveal;
  const tally = guessTally(state.guesses, answer?.graduate).slice(0, 4);
  if (!ready) return <section className="reveal-panel reveal-suspense" aria-live="polite"><Sparkles size={40} className="spin-slow"/><h2>And our graduate is…</h2><NameRoulette names={state.names}/></section>;
  if (!answer) return <section className="reveal-panel" aria-live="polite"><h2>Answer revealed!</h2></section>;
  return <section className="reveal-panel" aria-live="polite">
    <Confetti/>
    <div className="reveal-main">
      <div className="eyebrow">MEET OUR GRADUATE</div>
      <div className="avatar-ring">{answer.avatar && !avatarFailed ? <img src={answer.avatar} alt={answer.graduate} onError={() => setAvatarFailed(true)}/> : <div className="avatar-initials">{initials(answer.graduate)}</div>}</div>
      <h2 className="gradient-text">{answer.graduate}</h2>
      <h3>{answer.cluster}</h3>
      <div className="reveal-stats">
        <span><strong>{answer.correct}</strong> of {state.count} got it</span>
        <span><strong>{answer.percent}%</strong> correct</span>
        {answer.firstCorrect && <span className="first"><Zap size={14}/> First: <strong>{answer.firstCorrect}</strong></span>}
      </div>
    </div>
    {tally.length > 0 && <div className="tally">
      <div className="eyebrow">THE CROWD GUESSED</div>
      {tally.map((row, i) => <div className={`tally-row${row.correct ? ' correct' : ''}`} key={row.name}>
        <span className="tally-name">{row.name}{row.correct && ' ✓'}</span>
        <span className="tally-track"><span style={{ width: `${row.percent}%`, animationDelay: `${300 + i * 120}ms` }}/></span>
        <span className="tally-pct">{row.percent}%</span>
      </div>)}
    </div>}
  </section>;
}

export function Podium({ state }: { state: GameState }) {
  const [first, second, third] = state.leaderboard;
  const place = (p: typeof first, n: 1 | 2 | 3) => p && <div className={`podium-place place-${n}`}>
    {n === 1 && <Crown className="crown" size={34}/>}
    <Avatar name={p.player} size={n === 1 ? 76 : 58}/>
    <strong>{p.player}</strong><span>{p.points} pts</span>
    <div className="podium-block"><b>{n}</b></div>
  </div>;
  return <section className="winner">
    <Confetti pieces={60}/>
    <div className="eyebrow">OUR GRADUATION GAME CHAMPIONS</div>
    <h2>{first ? <>Congratulations, <span className="gradient-text">{first.player}</span>!</> : 'Thank you for playing!'}</h2>
    <p>A round of applause for everyone, and for our brilliant graduates 💜</p>
    {first && <div className="podium">{place(second, 2)}{place(first, 1)}{place(third, 3)}</div>}
  </section>;
}

function useSound(state: GameState, seconds: number) {
  const [enabled, setEnabled] = useState(false);
  const [activated, setActivated] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const previous = useRef({ count: 0, phase: state.phase, round: state.round });
  const chime = (frequency: number, delay = 0, duration = .15, volume = .035) => {
    const ctx = audio.current; if (!ctx) return;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination); osc.frequency.value = frequency;
    const start = ctx.currentTime + delay; gain.gain.setValueAtTime(volume, start); gain.gain.exponentialRampToValueAtTime(.001, start + duration);
    osc.start(start); osc.stop(start + duration);
  };
  useEffect(() => {
    const old = previous.current;
    if (enabled && state.count > old.count && state.round === old.round) { chime(660); chime(880, .08); }
    let id: number | undefined;
    if (enabled && state.phase === 'reveal' && (old.phase !== 'reveal' || old.round !== state.round)) {
      for (let i = 0; i < 20; i++) chime(110 + i * 6, i * .1, .08);
      id = window.setTimeout(() => { chime(523); chime(659, .15); chime(784, .3); chime(1047, .45, .8); }, 2200);
    }
    if (enabled && state.phase === 'end' && old.phase !== 'end') [523, 659, 784, 1047, 784, 1047].forEach((f, i) => chime(f, i * .16, .4));
    previous.current = { count: state.count, phase: state.phase, round: state.round };
    return () => { if (id !== undefined) window.clearTimeout(id); };
  }, [state.count, state.phase, state.round, enabled]);
  // A soft tick through the final five seconds.
  useEffect(() => {
    if (enabled && (state.phase === 'clue' || state.phase === 'hint') && seconds > 0 && seconds <= 5) chime(seconds === 1 ? 1200 : 900, 0, .07, .05);
  }, [seconds]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { void audio.current?.close(); }, []);
  return { enabled, activated, toggle: () => { if (!audio.current) audio.current = new AudioContext(); void audio.current.resume(); setActivated(true); setEnabled(e => !e); } };
}

export function GameScreen() {
  const { state, connected, demo, settings, seconds } = useGame(SCREEN_POLL_MS);
  const address = usePlayAddress(); const sound = useSound(state, seconds);
  const active = state.phase === 'clue' || state.phase === 'hint';
  const ready = readyToReveal(seconds, state.count, settings.target);
  return <div className="game-shell">
    {demo && <DemoBar/>}
    <BrandBar/>
    <main className="screen-content">
      <div className="screen-heading">
        <div><div className="eyebrow">THE GRADUATION GAME</div><h1>Guess the Graduate<span className="brand-dot">.</span></h1></div>
        <div className="heading-right">
          {state.round > 0 && <RoundPips round={state.round} total={state.totalRounds}/>}
          <div className="live-badge"><span className={`live-dot${connected ? ' on' : ''}`}/>{!connected ? 'CONNECTING…' : state.phase === 'waiting' ? 'STARTING SOON' : state.phase === 'end' ? 'FINAL RESULTS' : `ROUND ${state.round} OF ${state.totalRounds}`}</div>
        </div>
      </div>
      <div className="screen-grid">
        <div className="stage">
          {state.phase === 'waiting' && <Welcome address={address}/>}
          {active && <>
            <section className="panel clue-panel">
              <div className="clue-top"><div className="eyebrow">ROUND {state.round} · THE CLUE</div><Countdown seconds={seconds} total={settings.timer}/></div>
              {state.clue ? <ClueText text={state.clue} round={state.round}/> : <h2 className="clue-text">Your next clue is on its way…</h2>}
              {state.phase === 'hint' && state.hint && <div className="hint"><Lightbulb size={22}/><div><span className="eyebrow">A LITTLE HINT</span><p>{state.hint}</p></div></div>}
            </section>
            <GuessMeter count={state.count} target={settings.target}/>
            {ready && <div className="ready-banner"><Sparkles size={18}/> Ready to reveal!</div>}
            <CheerWall state={state}/>
          </>}
          {state.phase === 'reveal' && <Reveal state={state}/>}
          {state.phase === 'end' && <Podium state={state}/>}
          {state.phase !== 'waiting' && <div className="corner-join"><div className="mini-qr"><QRCodeSVG value={address} size={56}/></div><div><div className="eyebrow">JOIN THE GAME</div><Link to="/play">{address.replace(/^https?:\/\//, '')}</Link></div></div>}
        </div>
        <Leaderboard state={state}/>
      </div>
      <div className="screen-bottom"><p><Radio size={14} className="text-primary"/>{state.phase === 'waiting' ? 'Get comfy. The game starts soon.' : 'A little mystery. A lot of celebration.'}<Heart size={12} className="heart"/></p><Button variant="ghost" className="sound-button" onClick={sound.toggle} aria-label={!sound.activated ? 'Click to enable sound' : sound.enabled ? 'Mute sound' : 'Enable sound'}>{sound.enabled ? <Volume2 size={14}/> : <VolumeX size={14}/>} {!sound.activated ? 'Click to enable sound' : sound.enabled ? 'Sound on' : 'Sound off'}</Button></div>
    </main>
    <Footer/>
  </div>;
}
