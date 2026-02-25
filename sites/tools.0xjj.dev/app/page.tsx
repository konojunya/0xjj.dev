import Link from 'next/link';
import { tools } from './lib/tools';

export default function Home() {
  return (
    <main className="relative z-10 mx-auto max-w-5xl px-4 py-14">
      <div className="mb-12">
        <h1 className="text-3xl font-semibold tracking-tight text-fg">tools.0xjj.dev</h1>
        <p className="mt-2 text-sm text-muted">Useful tools for everyone.</p>
      </div>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool, i) => (
          <li
            key={tool.slug}
            style={{
              animation: 'fade-in 0.4s ease both',
              animationDelay: `${i * 0.08}s`,
            }}
          >
            <Link
              href={tool.href}
              className="group flex h-full flex-col gap-2 rounded-xl border border-[color-mix(in_srgb,var(--color-fg)_10%,transparent)] bg-[color-mix(in_srgb,var(--color-fg)_3%,transparent)] p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="font-mono text-xs text-muted transition-colors group-hover:text-fg">
                {tool.slug}
              </span>
              <span className="text-base font-semibold text-fg">{tool.name}</span>
              <span className="text-sm text-muted leading-relaxed">{tool.description}</span>
              <span className="mt-auto pt-3 font-mono text-xs text-muted transition-colors group-hover:text-fg">
                Open →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
