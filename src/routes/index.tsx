import { createFileRoute } from '@tanstack/react-router';
import { GameScreen } from '@/components/game/screen';
export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'Guess the Graduate | AuratTech Graduation' },
    { name: 'description', content: 'Join the live Guess the Graduate celebration for AuratTech Data & AI Fellowship Graduation 2026.' },
    { property: 'og:title', content: 'Guess the Graduate | AuratTech Graduation' },
    { property: 'og:description', content: 'Celebrate our graduating stars with clues, cheers and a little friendly competition.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: GameScreen,
});