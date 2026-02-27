import type { Metadata } from 'next';
import { tools } from '../lib/tools';
import { renderMarkdown } from '../lib/markdown';
import Article from '../lib/Article';
import Demo from './Demo';
import FloatingNavDemo from './FloatingNavDemo';
import enRaw from './en.md';
import jaRaw from './ja.md';

const tool = tools.find((t) => t.slug === 'liquid-glass')!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

export default async function Page() {
  const [en, ja] = await Promise.all([
    renderMarkdown(enRaw),
    renderMarkdown(jaRaw),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <a
        href="/"
        className="mb-6 inline-block font-mono text-xs text-muted transition-colors hover:text-fg"
      >
        ← back
      </a>
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Liquid Glass</h1>
      <p className="mt-1 text-sm text-muted">
        Drag the capsule to bend the page. SVG displacement filter refracts whatever sits beneath it.
      </p>
      <p className="mt-2 rounded bg-yellow-500/10 px-3 py-1.5 text-xs text-yellow-600 dark:text-yellow-400">
        Requires Chrome / Edge. backdrop-filter + SVG filter is not supported in Firefox / Safari.
      </p>

      <Demo />

      {/* Demo video for browsers that don't support the effect (iOS, Firefox, etc.) */}
      <div className="mt-6">
        <video
          src="/liquid-glass/demo.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full rounded-xl border border-black/10 dark:border-white/10"
        />
      </div>

      <Article en={en} ja={ja} />
      <FloatingNavDemo />

      <div className="mt-6">
        <video
          src="/liquid-glass/demo2.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full rounded-xl border border-black/10 dark:border-white/10"
        />
      </div>
    </div>
  );
}
