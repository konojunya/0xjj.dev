import type { Metadata } from 'next';
import { tools } from '../lib/tools';
import { TiltCard } from './TiltCard';

const tool = tools.find((t) => t.slug === 'tilt-card')!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

export default function Page() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <a
        href="/"
        className="mb-6 inline-block font-mono text-xs text-muted transition-colors hover:text-fg"
      >
        ← back
      </a>
      <h1 className="text-2xl font-semibold tracking-tight text-fg">
        {tool.name}
      </h1>
      <p className="mt-1 text-sm text-muted">{tool.description}</p>

      <div className="mt-8 flex justify-center">
        <div className="w-60">
          <TiltCard
            src="https://assets.xross-stars.com/card/BP02/BP02-087_e065c07289840e4acafe8ee5cfa59ac8.png"
            backSrc="https://assets.xross-stars.com/card/BP02/BP02-087_84dec236315bfdac4acc02146ea507d6.png"
            alt="Sample trading card"
          />
        </div>
      </div>
    </div>
  );
}
