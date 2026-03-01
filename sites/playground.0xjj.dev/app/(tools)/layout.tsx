'use client';

import Link from 'next/link';
import { haptic } from '../lib/haptic';

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-8 pb-10 sm:pt-10">
      <nav className="mb-6">
        <Link
          href="/"
          onClick={() => haptic()}
          className="inline-block font-mono text-xs text-muted transition-colors hover:text-fg"
        >
          ← back
        </Link>
      </nav>
      {children}
    </div>
  );
}
