'use client';

import { useState } from 'react';

type Preset = 'none' | 'basic' | 'bearer';

interface HeaderRow {
  key: string;
  value: string;
}

interface CustomHeadersProps {
  onChange: (headers: Record<string, string>) => void;
}

export default function CustomHeaders({ onChange }: CustomHeadersProps) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<Preset>('none');
  const [basicUser, setBasicUser] = useState('');
  const [basicPass, setBasicPass] = useState('');
  const [bearerToken, setBearerToken] = useState('');
  const [rows, setRows] = useState<HeaderRow[]>([]);

  function emit(
    nextPreset = preset,
    nextUser = basicUser,
    nextPass = basicPass,
    nextToken = bearerToken,
    nextRows = rows,
  ) {
    const headers: Record<string, string> = {};

    if (nextPreset === 'basic' && (nextUser || nextPass)) {
      headers['Authorization'] = `Basic ${btoa(`${nextUser}:${nextPass}`)}`;
    } else if (nextPreset === 'bearer' && nextToken) {
      headers['Authorization'] = `Bearer ${nextToken}`;
    }

    for (const r of nextRows) {
      const k = r.key.trim();
      if (k) headers[k] = r.value;
    }

    onChange(headers);
  }

  function setPresetAndEmit(p: Preset) {
    setPreset(p);
    emit(p);
  }

  function addRow() {
    const next = [...rows, { key: '', value: '' }];
    setRows(next);
  }

  function updateRow(idx: number, field: 'key' | 'value', val: string) {
    const next = rows.map((r, i) => (i === idx ? { ...r, [field]: val } : r));
    setRows(next);
    emit(undefined, undefined, undefined, undefined, next);
  }

  function removeRow(idx: number) {
    const next = rows.filter((_, i) => i !== idx);
    setRows(next);
    emit(undefined, undefined, undefined, undefined, next);
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
        Custom Headers
      </button>

      {open && (
        <div className="mt-3 space-y-4 rounded-xl border border-[color-mix(in_srgb,var(--color-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--color-fg)_3%,transparent)] p-4">
          {/* Presets */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Presets
            </p>
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
          </div>

          {/* Basic Auth fields */}
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

          {/* Bearer Token field */}
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

          {/* Manual headers */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Manual Headers
            </p>
            {rows.map((row, i) => (
              <div key={i} className="mb-2 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Header name"
                  value={row.key}
                  onChange={(e) => updateRow(i, 'key', e.target.value)}
                  className={`${inputClass} flex-[2]`}
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={row.value}
                  onChange={(e) => updateRow(i, 'value', e.target.value)}
                  className={`${inputClass} flex-[3]`}
                />
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="shrink-0 rounded-md p-1.5 text-muted transition-colors hover:bg-red-500/10 hover:text-red-500"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addRow}
              className="font-mono text-xs text-muted transition-colors hover:text-fg"
            >
              + Add header
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
