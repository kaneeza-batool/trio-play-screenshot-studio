import { createFileRoute } from '@tanstack/react-router';
import { HostPage } from '@/components/game/host';
export const Route = createFileRoute('/host')({
  head: () => ({ meta: [
    { title: 'Host · Guess the Graduate | AuratTech Graduation' },
    { name: 'description', content: 'Private host controls for the AuratTech Graduation 2026 live guessing game.' },
    { property: 'og:title', content: 'Host · Guess the Graduate | AuratTech Graduation' },
    { property: 'og:description', content: 'Manage rounds, hints, reveals and live cheers for the graduation ceremony.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'robots', content: 'noindex, nofollow' },
  ] }),
  component: HostPage,
});