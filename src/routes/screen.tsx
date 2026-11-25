import { createFileRoute } from '@tanstack/react-router';
import { GameScreen } from '@/components/game/screen';
export const Route = createFileRoute('/screen')({
  head: () => ({ meta: [
    { title: 'Live Screen · Guess the Graduate | AuratTech Graduation' },
    { name: 'description', content: 'The live ceremony screen for AuratTech Guess the Graduate, with clues, graduate reveals and the top five.' },
    { property: 'og:title', content: 'Live Screen · Guess the Graduate | AuratTech Graduation' },
    { property: 'og:description', content: 'Watch our graduating stars shine in the live AuratTech graduation game.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: GameScreen,
});