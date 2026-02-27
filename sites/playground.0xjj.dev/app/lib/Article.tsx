'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import './prose.css';

type Lang = 'ja' | 'en';

interface Props {
  ja?: ReactNode;
  en?: ReactNode;
}

export default function Article({ ja, en }: Props) {
  const available = [
    en ? 'en' : null,
    ja ? 'ja' : null,
  ].filter(Boolean) as Lang[];

  const [lang, setLang] = useState<Lang>(available[0]);

  if (available.length === 0) return null;

  const content = lang === 'ja' ? ja : en;
  if (!content) return null;

  return (
    <article className="mt-12 max-w-3xl">
      {available.length > 1 && (
        <div className="mb-6 flex items-center gap-2">
          {available.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`rounded-md px-3 py-1 font-mono text-xs transition-colors ${
                lang === l
                  ? 'bg-fg/10 text-fg'
                  : 'text-muted hover:bg-fg/5 hover:text-fg'
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      )}
      <div className="prose">
        {content}
      </div>
    </article>
  );
}
