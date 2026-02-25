'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { tools } from '../lib/tools';

export default function ToolMap() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onOutside);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onOutside);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Tool map"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-[color-mix(in_srgb,var(--color-fg)_8%,transparent)] hover:text-fg"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="1" width="5" height="5" rx="1.5" fill="currentColor" />
          <rect x="10" y="1" width="5" height="5" rx="1.5" fill="currentColor" />
          <rect x="1" y="10" width="5" height="5" rx="1.5" fill="currentColor" />
          <rect x="10" y="10" width="5" height="5" rx="1.5" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-72 overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--color-bg)_95%,transparent)] shadow-lg backdrop-blur-md">
          <div className="border-b border-[color-mix(in_srgb,var(--color-fg)_8%,transparent)] px-4 py-3">
            <p className="font-mono text-xs text-muted">tool map</p>
          </div>
          <ul className="p-2">
            {tools.map((tool) => {
              const active = pathname.startsWith(tool.href);
              return (
                <li key={tool.slug}>
                  <Link
                    href={tool.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[color-mix(in_srgb,var(--color-fg)_6%,transparent)] ${active ? 'bg-[color-mix(in_srgb,var(--color-fg)_6%,transparent)]' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-fg">{tool.name}</span>
                        {active && (
                          <span className="font-mono text-[10px] text-muted border border-[color-mix(in_srgb,var(--color-fg)_15%,transparent)] rounded-full px-1.5 py-0.5 leading-none">
                            current
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted leading-relaxed line-clamp-2">
                        {tool.description}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-[color-mix(in_srgb,var(--color-fg)_8%,transparent)] px-4 py-2.5">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="font-mono text-xs text-muted transition-colors hover:text-fg"
            >
              ← all tools
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
