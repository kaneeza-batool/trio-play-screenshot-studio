import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowUpRight, Check, Heart, Radio, Sparkles, Trophy, Volume2, VolumeX, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type GameState, readyToReveal, SCREEN_POLL_MS } from '@/lib/game';
import { BrandBar, Footer, GraduationArt } from './brand';
import { useGame, usePlayAddress } from './use-game';

export function Leaderboard({ state, compact = false }: { state: GameState; compact?: boolean }) {
  return <aside className={compact ? 'panel' : 'sidebar'}><div className="sidebar-title"><span>TOP 5</span><Trophy size={17}/></div>{state.leaderboard.length ? <div className="flex-1">{state.leaderboard.slice(0,5).map((player,i) => <div className="leader-row" key={`${player.player}-${i}`}><span className="rank">{i+1}</span><span className="leader-name">{player.player}</span><span className="leader-points">{player.points} <span className="text-muted-foreground text-xs font-normal">pts</span></span></div>)}</div> : <div className="leader-empty"><div className="trophy-disc"><Trophy size={28}/></div><h3>A little friendly competition</h3><p>Our leaderboard is waiting for its first stars.</p></div>}<div className="leader-note"><Zap size={12}/>Every great guess counts</div></aside>;
}
function Confetti() { return <div className="confetti" aria-hidden="true">{Array.from({length:10},(_,i)=><i key={i}/>)}</div>; }
function Welcome({ address }: { address: string }) {
  return <><section className="welcome-banner"><div><div className="eyebrow">A celebration of our graduating stars</div><h2>Big dreams.<br/>Brilliant women.<br/>Who’s behind the clue?</h2><p>A little mystery. A lot of celebration.</p></div><GraduationArt/></section><section className="join-section"><div><div className="eyebrow">YOU’RE INVITED TO PLAY</div><h3>Grab your phone and open:</h3><Link to="/play" className="play-address">{address.replace(/^https?:\/\//,'')} <ArrowUpRight size={17} className="inline"/></Link><p>Or scan the code. Your first guess awaits.</p><span className="join-pill"><Check size={13}/> No downloads. Just you.</span></div><div className="qr-frame"><QRCodeSVG value={address} size={124} level="M"/><span>SCAN TO JOIN</span></div></section></>;
}
export function Countdown({ seconds, total }: { seconds: number; total: number }) {
  return <div className="timer" aria-label={`${seconds} seconds remaining`}><svg viewBox="0 0 80 80"><defs><linearGradient id="countdown-gradient"><stop stopColor="var(--primary)"/><stop offset="1" stopColor="var(--blue)"/></linearGradient></defs><circle className="timer-track" cx="40" cy="40" r="34" fill="none" strokeWidth="5"/><circle cx="40" cy="40" r="34" fill="none" stroke="url(#countdown-gradient)" strokeWidth="5" strokeLinecap="round" strokeDasharray="213.6" strokeDashoffset={213.6*(1-seconds/total)}/></svg><span>{seconds}</span></div>;
}
function Reveal({ state }: { state: GameState }) {
  const [ready,setReady] = useState(false);
  useEffect(()=>{ setReady(false); const id = window.setTimeout(()=>setReady(true),1500); return ()=>window.clearTimeout(id); },[state.round]);
  const answer = state.reveal;
  return <section className="reveal-panel" aria-live="polite">{!ready ? <div className="status-panel"><Sparkles size={45}/><h2>And our graduate is…</h2></div> : answer ? <><Confetti/><div className="eyebrow">MEET OUR GRADUATE</div><div className="avatar-ring">{answer.avatar ? <img src={answer.avatar} alt={answer.graduate}/> : <div className="avatar-initials">{answer.graduate.split(' ').map(n=>n[0]).slice(0,2).join('')}</div>}</div><h2>{answer.graduate}</h2><h3>{answer.cluster}</h3><p>{answer.correct} of {state.count} guessed right ({answer.percent}%)</p>{answer.firstCorrect && <p className="text-secondary-foreground">First to get it: <strong>{answer.firstCorrect}</strong> ⚡</p>}</> : <h2>Answer revealed!</h2>}</section>;
}
function useSound(state: GameState) {
  const [enabled,setEnabled] = useState(false);
  const [activated,setActivated] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const previous = useRef({count:0, phase:state.phase, round:state.round});
  const chime = (frequency: number, delay=0, duration=.15) => {
    const ctx=audio.current; if(!ctx) return;
    const osc=ctx.createOscillator(); const gain=ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination); osc.frequency.value=frequency;
    const start=ctx.currentTime+delay; gain.gain.setValueAtTime(.035,start); gain.gain.exponentialRampToValueAtTime(.001,start+duration);
    osc.start(start); osc.stop(start+duration);
  };
  useEffect(()=>{
    const old=previous.current;
    if(enabled && state.count>old.count && state.round===old.round) chime(660);
    let id: number | undefined;
    if(enabled && state.phase==='reveal' && (old.phase!=='reveal' || old.round!==state.round)) {
      for(let i=0;i<12;i++) chime(120+i*8,i*.1,.09);
      id=window.setTimeout(()=>{chime(523);chime(659,.15);chime(784,.3,.6);},1500);
    }
    previous.current={count:state.count,phase:state.phase,round:state.round};
    return ()=>{ if(id!==undefined) window.clearTimeout(id); };
  },[state.count,state.phase,state.round,enabled]);
  useEffect(()=>()=>{void audio.current?.close();},[]);
  return {enabled,activated,toggle:()=>{if(!audio.current) audio.current=new AudioContext();void audio.current.resume();setActivated(true);setEnabled(e=>!e);}};
}
export function GameScreen() {
  const {state, connected,settings,seconds}=useGame(SCREEN_POLL_MS);
  const address=usePlayAddress(); const sound=useSound(state);
  const active=state.phase==='clue'||state.phase==='hint';
  return <div className="game-shell"><BrandBar/><main className="screen-content"><div className="screen-heading"><div><div className="eyebrow">THE GRADUATION GAME</div><h1>Guess the Graduate<span className="text-primary">.</span></h1></div><div className="live-badge"><span className="live-dot"/>{!connected ? 'WAITING TO CONNECT' : state.phase==='waiting' ? 'STARTING SOON' : `ROUND ${state.round} OF ${state.totalRounds}`}</div></div><div className="screen-grid"><div>{state.phase==='waiting' && <Welcome address={address}/>} {active && <><div className="panel clue-panel"><div className="eyebrow">ROUND {state.round} OF {state.totalRounds}</div><h2>{state.clue || 'Your next clue is on its way…'}</h2></div>{state.phase==='hint' && state.hint && <div className="hint"><span className="eyebrow">A LITTLE HINT</span><p className="text-xl mt-2 mb-0">{state.hint}</p></div>}<div className="round-status"><div className="count-circle"><strong>{state.count}</strong><span>guesses</span></div><div className="eyebrow">LIVE GUESSES</div><Countdown seconds={seconds} total={settings.timer}/></div>{readyToReveal(seconds,state.count,settings.target) && <div className="ready-banner">Ready to reveal!</div>}<div className="cheers">{state.guesses?.filter(g=>g.message).map(g=><div className="cheer" key={g.id}><strong>{g.player}:</strong> {g.message}</div>)}</div></>}{state.phase==='reveal' && <Reveal state={state}/>} {state.phase==='end' && <section className="winner"><Confetti/><Trophy className="mx-auto" size={48}/><div className="eyebrow mt-5 text-primary-foreground">OUR GRADUATION GAME CHAMPION</div><h2>Guess the Graduate Champion 🏆</h2><h2>{state.leaderboard[0]?.player || 'Our brilliant fellowship'}</h2><p>{state.leaderboard[0]?.points ?? 0} points · A round of applause!</p></section>}{state.phase!=='waiting' && <div className="corner-join"><QRCodeSVG value={address} size={52}/><div><div className="eyebrow">JOIN THE GAME</div><Link to="/play">{address.replace(/^https?:\/\//,'')}</Link></div></div>}</div><Leaderboard state={state}/></div><div className="screen-bottom"><p><Radio size={14} className="text-primary"/>{state.phase==='waiting' ? 'Get comfy. The game starts soon.' : 'A little mystery. A lot of celebration.'}<Heart size={12} className="text-secondary-foreground"/></p><Button variant="ghost" className="sound-button" onClick={sound.toggle} aria-label={!sound.activated ? 'Click to enable sound' : sound.enabled ? 'Mute sound' : 'Enable sound'}>{sound.enabled ? <Volume2 size={14}/> : <VolumeX size={14}/>} {!sound.activated ? 'Click to enable sound' : sound.enabled ? 'Sound on' : 'Sound off'}</Button></div></main><Footer/></div>;
}
