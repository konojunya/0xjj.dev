'use client';

import { useState } from 'react';

type Preset = 'none' | 'basic' | 'bearer';

interface CustomHeadersProps {
  onChange: (headers: Record<string, string>) => void;
}

export default function CustomHeaders({ onChange }: CustomHeadersProps) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<Preset>('none');
  const [basicUser, setBasicUser] = useState('');
  const [basicPass, setBasicPass] = useState('');
  const [bearerToken, setBearerToken] = useState('');

  function emit(
    nextPreset = preset,
    nextUser = basicUser,
    nextPass = basicPass,
    nextToken = bearerToken,
  ) {
    const headers: Record<string, string> = {};

    if (nextPreset === 'basic' && (nextUser || nextPass)) {
      headers['Authorization'] = `Basic ${btoa(`${nextUser}:${nextPass}`)}`;
    } else if (nextPreset === 'bearer' && nextToken) {
      headers['Authorization'] = `Bearer ${nextToken}`;
    }

    onChange(headers);
  }

  function setPresetAndEmit(p: Preset) {
    setPreset(p);
    emit(p);
  }

  const inputClass =
    'w-full rounded-md border border-[color-mix(in_srgb,var(--color-fg)_15%,transparent)] bg-[color-mix(in_srgb,var(--color-fg)_4%,transparent)] px-3 py-1.5 font-mono text-xs text-fg outline-none placeholder:text-muted focus:border-[color-mix(in_srgb,var(--color-fg)_35%,transparent)]';

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 font-mono text-xs text-muted transition-colors hover:text-fg"
      >
        <svg
          className={`h-3 w-3 transition-transform ${open ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        Authorization
      </button>

      {open && (
        <div className="mt-3 space-y-4 rounded-xl border border-[color-mix(in_srgb,var(--color-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--color-fg)_3%,transparent)] p-4">
          <div className="flex flex-wrap gap-2">
            {(['basic', 'bearer'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPresetAndEmit(preset === p ? 'none' : p)}
                className={`rounded-md border px-3 py-1 font-mono text-xs transition-colors ${
                  preset === p
                    ? 'border-accent/50 bg-accent/10 text-accent'
                    : 'border-[color-mix(in_srgb,var(--color-fg)_15%,transparent)] text-muted hover:text-fg'
                }`}
              >
                {p === 'basic' ? 'Basic Auth' : 'Bearer Token'}
              </button>
            ))}
          </div>

          {preset === 'basic' && (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Username"
                value={basicUser}
                onChange={(e) => {
                  setBasicUser(e.target.value);
                  emit('basic', e.target.value, basicPass);
                }}
                className={inputClass}
              />
              <input
                type="password"
                placeholder="Password"
                value={basicPass}
                onChange={(e) => {
                  setBasicPass(e.target.value);
                  emit('basic', basicUser, e.target.value);
                }}
                className={inputClass}
              />
            </div>
          )}

          {preset === 'bearer' && (
            <input
              type="password"
              placeholder="Token"
              value={bearerToken}
              onChange={(e) => {
                setBearerToken(e.target.value);
                emit('bearer', undefined, undefined, e.target.value);
              }}
              className={inputClass}
            />
          )}
        </div>
      )}
    </div>
  );
}
