import type { Metadata } from 'next';
import ToolGrid from './ToolGrid';

export const metadata: Metadata = {
  openGraph: {
    title: 'Playground',
    description: 'A playground for tools, games & experiments.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  twitter: {
    title: 'Playground',
    description: 'A playground for tools, games & experiments.',
    images: ['/opengraph-image'],
  },
};

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-14">
      <div className="mb-12">
        <h1 className="text-3xl font-semibold tracking-tight text-fg">Playground</h1>
        <p className="mt-2 text-sm text-muted">Tools, games & experiments.</p>
      </div>

      <ToolGrid />
    </main>
  );
}
