'use client';

import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import { useQueryState, parseAsStringLiteral } from 'nuqs';
import Link from 'next/link';
import { useWebHaptics } from 'web-haptics/react';
import { categories, tools } from './lib/tools';

const categoryValues = ['tool', 'game', 'ui'] as const;

export default function ToolGrid() {
  const [query, setQuery] = useQueryState('q', { defaultValue: '' });
  const [activeCategory, setActiveCategory] = useQueryState('category', parseAsStringLiteral(categoryValues).withDefault(null));
  const { trigger } = useWebHaptics();

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return tools
      .filter((t) => {
        if (activeCategory && t.category !== activeCategory) return false;
        if (q && !t.name.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q) && !t.slug.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [query, activeCategory]);

  const border = 'color-mix(in srgb, var(--color-fg) 12%, transparent)';

  return (
    <>
      {/* Search + Filter */}
      <div className="mb-8 space-y-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tools..."
          className="w-full rounded-lg border bg-transparent px-4 py-2.5 font-mono text-base text-fg outline-none transition-colors placeholder:text-muted"
          style={{ borderColor: border }}
        />
        <div className="flex gap-2">
          <button
            onClick={() => { trigger('light'); setActiveCategory(null); }}
            className="rounded-full border px-3 py-1 font-mono text-xs transition-colors"
            style={{
              borderColor: !activeCategory ? 'var(--color-fg)' : border,
              background: !activeCategory ? 'var(--color-fg)' : 'transparent',
              color: !activeCategory ? 'var(--color-bg)' : 'var(--color-muted)',
            }}
          >
            All
          </button>
          {categories.map((cat) => {
            const isActive = activeCategory === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => { trigger('light'); setActiveCategory(isActive ? null : cat.value); }}
                className="rounded-full border px-3 py-1 font-mono text-xs transition-colors"
                style={{
                  borderColor: isActive ? 'var(--color-fg)' : border,
                  background: isActive ? 'var(--color-fg)' : 'transparent',
                  color: isActive ? 'var(--color-bg)' : 'var(--color-muted)',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tool, i) => (
            <li
              key={tool.slug}
              className="card-enter"
              style={{ '--card-delay': `${i * 0.04}s` } as CSSProperties}
            >
              <Link
                href={tool.href}
                className="group flex h-full flex-col gap-2 rounded-xl border border-[color-mix(in_srgb,var(--color-fg)_10%,transparent)] bg-[color-mix(in_srgb,var(--color-fg)_3%,transparent)] p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted transition-colors group-hover:text-fg">
                    {tool.slug}
                  </span>
                  <span
                    className="rounded-full px-1.5 py-0.5 font-mono text-[10px] leading-none"
                    style={{
                      background: 'color-mix(in srgb, var(--color-fg) 8%, transparent)',
                      color: 'var(--color-muted)',
                    }}
                  >
                    {tool.category}
                  </span>
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
      ) : (
        <p className="py-12 text-center font-mono text-sm text-muted">
          No results found.
        </p>
      )}
    </>
  );
}
