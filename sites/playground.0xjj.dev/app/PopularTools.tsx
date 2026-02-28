'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import type { Tool } from './lib/tools';

interface PopularToolsProps {
  items: (Tool & { views: number })[];
}

const medals = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];

export default function PopularTools({ items }: PopularToolsProps) {
  if (items.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="mb-4 font-mono text-xs font-medium text-muted">Popular</h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {items.map((item, i) => (
          <li
            key={item.slug}
            className="card-enter"
            style={{ '--card-delay': `${i * 0.06}s` } as CSSProperties}
          >
            <Link
              href={item.href}
              className="group flex items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--color-fg)_10%,transparent)] bg-[color-mix(in_srgb,var(--color-fg)_3%,transparent)] px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="text-xl">{medals[i]}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-semibold text-fg">{item.name}</span>
                <span className="font-mono text-[11px] text-muted">
                  {item.views.toLocaleString()} views
                </span>
              </span>
              <span className="font-mono text-xs text-muted transition-colors group-hover:text-fg">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
