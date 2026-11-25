import { createFileRoute } from '@tanstack/react-router';
import { PlayerPage } from '@/components/game/play';
export const Route = createFileRoute('/play')({
  head: () => ({ meta: [
    { title: 'Play · Guess the Graduate | AuratTech Graduation' },
    { name: 'description', content: 'Guess the AuratTech graduate, send a cheer and join the Graduation 2026 celebration from your phone.' },
    { property: 'og:title', content: 'Play · Guess the Graduate | AuratTech Graduation' },
    { property: 'og:description', content: 'Lock your guess and cheer for our Data & AI Fellowship graduates.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: PlayerPage,
});