import { useMemo } from 'react';
import { Heart } from 'lucide-react';
import { avatarHue, initials, type Phase } from '@/lib/game';

export function BrandBar() {
  return <header className="brandbar">
    <a href="https://aurattech.com" className="brand" target="_blank" rel="noreferrer"><img src="/brand/aurattech-logo.png" alt="AuratTech" width={500} height={500}/></a>
    <div className="wordmark"><span className="wordmark-top">AuratTech</span><strong>Data &amp; AI Fellowship</strong><span className="wordmark-sub">Graduation 2026</span></div>
  </header>;
}

export function Footer() { return <footer className="footer"><img src="/brand/aurattech-logo.png" alt="" width={500} height={500} className="footer-logo"/><span>AuratTech Data &amp; AI Fellowship · Graduation 2026</span><Heart size={12} className="heart" aria-label="With love" /></footer>; }

/** A floating mortarboard with a swinging gold tassel and twinkling sparkles. */
export function GraduationArt() {
  return <svg className="grad-art" viewBox="0 0 240 190" fill="none" role="img" aria-label="Graduation cap and celebratory stars">
    <ellipse className="grad-shadow" cx="120" cy="170" rx="70" ry="8" fill="currentColor" opacity=".12"/>
    <g className="grad-cap">
      <path d="M68 91v39c26 24 79 25 108-1V91l-54 25-54-25Z" fill="currentColor" opacity=".78"/>
      <path d="m35 73 87-40 86 40-86 40-87-40Z" fill="currentColor"/>
      <g className="grad-tassel"><path d="m122 73 77 14v45" stroke="var(--tassel)" strokeWidth="4" strokeLinecap="round"/><path d="m199 132-8 23h16l-8-23Z" fill="var(--tassel)"/></g>
      <circle cx="122" cy="73" r="5" fill="var(--tassel)"/>
    </g>
    <g className="grad-sparkles" fill="var(--tassel)">
      <path d="m29 31 3 9 9 3-9 3-3 9-3-9-9-3 9-3 3-9Z"/><path d="m206 15 4 12 12 4-12 4-4 12-4-12-12-4 12-4 4-12Z"/><path d="m42 129 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"/>
    </g>
    <circle cx="172" cy="20" r="3" fill="currentColor" opacity=".7"/><circle cx="21" cy="100" r="3" fill="currentColor" opacity=".6"/>
  </svg>;
}

const AVATAR_GRADIENTS = [
  ['#00B34D', '#00ACA4'], ['#00ACA4', '#251BF7'], ['#251BF7', '#460BDC'], ['#460BDC', '#8B6CF5'], ['#E74393', '#8B6CF5'], ['#25213B', '#460BDC'],
];
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const [from, to] = AVATAR_GRADIENTS[avatarHue(name) % AVATAR_GRADIENTS.length]!;
  return <span className="avatar" aria-hidden="true" style={{ width: size, height: size, fontSize: size * 0.4, background: `linear-gradient(135deg, ${from}, ${to})` }}>{initials(name)}</span>;
}

export function RoundPips({ round, total }: { round: number; total: number }) {
  return <div className="round-pips" aria-label={`Round ${round} of ${total}`}>{Array.from({ length: total }, (_, i) => <span key={i} className={i + 1 < round ? 'done' : i + 1 === round ? 'current' : ''}/>)}</div>;
}

const CONFETTI_COLOURS = ['var(--green)', 'var(--teal)', 'var(--magenta)', 'var(--purple)', 'var(--coral)', 'var(--mauve)'];
/** A burst of confetti; positions come from the index, so they are stable between renders. */
export function Confetti({ pieces = 44 }: { pieces?: number }) {
  const bits = useMemo(() => Array.from({ length: pieces }, (_, i) => {
    const r = (n: number) => ((Math.sin((i + 1) * n) + 1) / 2);
    return { left: `${r(12.9898) * 100}%`, delay: `${r(78.233) * 0.9}s`, duration: `${2.2 + r(37.719) * 1.8}s`, drift: `${(r(4.17) - 0.5) * 160}px`, spin: `${360 + r(9.1) * 720}deg`, colour: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length], round: i % 3 === 0 };
  }), [pieces]);
  return <div className="confetti" aria-hidden="true">{bits.map((b, i) => <i key={i} className={b.round ? 'round' : ''} style={{ left: b.left, background: b.colour, animationDelay: b.delay, animationDuration: b.duration, ['--drift' as string]: b.drift, ['--spin' as string]: b.spin }}/>)}</div>;
}

const DEMO_PHASES: Phase[] = ['waiting', 'clue', 'hint', 'reveal', 'end'];
/** Shown only in ?demo mode so a host can rehearse every phase without touching the live game. */
export function DemoBar() {
  const current = typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('demo');
  return <nav className="demo-bar" aria-label="Demo phases"><strong>DEMO</strong>{DEMO_PHASES.map(p => <a key={p} href={`?demo=${p}`} aria-current={current === p ? 'page' : undefined}>{p}</a>)}</nav>;
}
