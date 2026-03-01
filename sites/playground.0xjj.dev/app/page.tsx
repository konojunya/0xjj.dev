import type { Metadata } from 'next';
import { Suspense } from 'react';
import { tools } from './lib/tools';
import { getTopTools } from './lib/views';
import PopularTools from './PopularTools';
import ToolGrid from './ToolGrid';

export const metadata: Metadata = {
  openGraph: {
    title: 'Playground',
    description: 'A playground for tools, games & experiments.',
  },
  twitter: {
    title: 'Playground',
    description: 'A playground for tools, games & experiments.',
  },
};

export default async function Home() {
  const topTools = await getTopTools();
  const popular = topTools
    .map((t) => {
      const tool = tools.find((x) => x.slug === t.slug);
      return tool ? { ...tool, views: t.views } : null;
    })
    .filter((t) => t !== null);

  return (
    <main className="mx-auto max-w-5xl px-4 py-14">
      <div className="mb-12">
        <h1 className="text-3xl font-semibold tracking-tight text-fg">Playground</h1>
        <p className="mt-2 text-sm text-muted">Tools, games & experiments.</p>
      </div>

      <PopularTools items={popular} />
      <Suspense>
        <ToolGrid />
      </Suspense>
    </main>
  );
}
