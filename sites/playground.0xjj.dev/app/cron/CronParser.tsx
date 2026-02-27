'use client';

import { useMemo, useState } from 'react';

// ─── Cron parser ────────────────────────────────────────────────────────────

function parseCronField(field: string, min: number, max: number): number[] | null {
  const values = new Set<number>();
  for (const part of field.split(',')) {
    if (part === '*') {
      for (let i = min; i <= max; i++) values.add(i);
    } else if (part.includes('/')) {
      const [range, stepStr] = part.split('/');
      const step = parseInt(stepStr);
      if (isNaN(step) || step <= 0) return null;
      let start = min;
      let end = max;
      if (range !== '*') {
        if (range.includes('-')) {
          const [a, b] = range.split('-').map(Number);
          if (isNaN(a) || isNaN(b)) return null;
          start = a; end = b;
        } else {
          start = parseInt(range);
          if (isNaN(start)) return null;
        }
      }
      for (let i = start; i <= end; i += step) values.add(i);
    } else if (part.includes('-')) {
      const [a, b] = part.split('-').map(Number);
      if (isNaN(a) || isNaN(b)) return null;
      for (let i = a; i <= b; i++) values.add(i);
    } else {
      const n = parseInt(part);
      if (isNaN(n)) return null;
      values.add(n);
    }
  }
  const arr = Array.from(values).sort((a, b) => a - b);
  if (arr.some((v) => v < min || v > max)) return null;
  return arr;
}

function getNextRuns(expr: string, count: number): Date[] {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) throw new Error('Expected 5 space-separated fields');

  const [minF, hourF, domF, monF, dowF] = fields;
  const minutes = parseCronField(minF, 0, 59);
  const hours   = parseCronField(hourF, 0, 23);
  const doms    = parseCronField(domF, 1, 31);
  const months  = parseCronField(monF, 1, 12);
  const rawDow  = parseCronField(dowF, 0, 7);

  if (!minutes || !hours || !doms || !months || !rawDow)
    throw new Error('Invalid field value');

  // Normalise Sunday: 7 → 0
  const dows = Array.from(new Set(rawDow.map((d) => (d === 7 ? 0 : d)))).sort((a, b) => a - b);

  const results: Date[] = [];
  // Start from the next minute
  const current = new Date();
  current.setSeconds(0, 0);
  current.setMinutes(current.getMinutes() + 1);

  const limit = new Date(current.getTime() + 4 * 365 * 24 * 60 * 60 * 1000);

  while (results.length < count && current < limit) {
    const month = current.getMonth() + 1;
    const dom   = current.getDate();
    const hour  = current.getHours();
    const min   = current.getMinutes();
    const dow   = current.getDay();

    if (
      months.includes(month) &&
      doms.includes(dom) &&
      dows.includes(dow) &&
      hours.includes(hour) &&
      minutes.includes(min)
    ) {
      results.push(new Date(current));
    }

    current.setMinutes(current.getMinutes() + 1);
  }

  return results;
}

// ─── Human-readable description ─────────────────────────────────────────────

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOW_NAMES   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function describeField(field: string, names?: string[]): string {
  if (field === '*') return 'every';
  if (names) {
    return parseCronField(field, 0, names.length - 1)
      ?.map((n) => names[n])
      .join(', ') ?? field;
  }
  return field.replace(/,/g, ', ');
}

function describeCron(expr: string): string {
  const f = expr.trim().split(/\s+/);
  if (f.length !== 5) return '';
  const [min, hour, dom, mon, dow] = f;

  if (min === '*' && hour === '*' && dom === '*' && mon === '*' && dow === '*')
    return 'Every minute';
  if (min === '0' && hour === '*' && dom === '*' && mon === '*' && dow === '*')
    return 'Every hour, at minute 0';
  if (min === '0' && hour === '0' && dom === '*' && mon === '*' && dow === '*')
    return 'Every day at 00:00';
  if (min === '0' && hour === '0' && dom === '*' && mon === '*' && dow === '1')
    return 'Every Monday at 00:00';
  if (min === '0' && hour === '0' && dom === '1' && mon === '*' && dow === '*')
    return 'At 00:00 on day 1 of every month';
  if (min === '0' && hour === '0' && dom === '1' && mon === '1' && dow === '*')
    return 'At 00:00 on January 1st';

  const parts: string[] = [];
  parts.push(`minute ${describeField(min)}`);
  parts.push(`hour ${describeField(hour)}`);
  if (dom !== '*') parts.push(`day-of-month ${describeField(dom)}`);
  if (mon !== '*') parts.push(`month ${describeField(mon, MONTH_NAMES)}`);
  if (dow !== '*') parts.push(`day-of-week ${describeField(dow, DOW_NAMES)}`);
  return `At ${parts.join(', ')}`;
}

// ─── Presets ────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every hour',   value: '0 * * * *' },
  { label: 'Daily',        value: '0 0 * * *' },
  { label: 'Weekly',       value: '0 0 * * 1' },
  { label: 'Monthly',      value: '0 0 1 * *' },
] as const;

// ─── Component ──────────────────────────────────────────────────────────────

const FIELD_LABELS = ['minute', 'hour', 'dom', 'month', 'dow'];

export default function CronParser() {
  const [expr, setExpr] = useState('0 9 * * 1-5');

  const { runs, description, error } = useMemo(() => {
    if (!expr.trim()) return { runs: [], description: '', error: null };
    try {
      const runs = getNextRuns(expr, 10);
      const description = describeCron(expr);
      return { runs, description, error: null };
    } catch (e) {
      return { runs: [], description: '', error: (e as Error).message };
    }
  }, [expr]);

  const fields = expr.trim().split(/\s+/);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <a href="/" className="mb-6 inline-block font-mono text-xs text-muted transition-colors hover:text-fg">
          ← back
        </a>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Cron Expression Parser</h1>
        <p className="mt-1 text-sm text-muted">
          Parse cron expressions and preview the next scheduled run times.
        </p>
      </div>

      {/* Presets */}
      <div className="mb-4 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => setExpr(p.value)}
            className="rounded-lg border px-3 py-1 font-mono text-xs transition-colors"
            style={
              expr === p.value
                ? { borderColor: 'var(--color-fg)', background: 'var(--color-fg)', color: 'var(--color-bg)' }
                : { borderColor: 'color-mix(in srgb, var(--color-fg) 12%, transparent)', color: 'var(--color-muted)' }
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Expression input */}
      <div className="mb-2">
        <input
          type="text"
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          placeholder="* * * * *"
          className="w-full rounded-lg border bg-transparent px-3 py-2.5 font-mono text-base text-fg outline-none transition-colors"
          style={{
            borderColor: error
              ? 'color-mix(in srgb, #ef4444 60%, transparent)'
              : 'color-mix(in srgb, var(--color-fg) 12%, transparent)',
          }}
          spellCheck={false}
        />
      </div>

      {/* Field labels */}
      <div className="mb-4 flex gap-2 px-1">
        {FIELD_LABELS.map((label, i) => (
          <span
            key={label}
            className="flex-1 text-center font-mono text-xs text-muted"
            style={{ opacity: fields.length === 5 && fields[i] !== '*' ? 1 : 0.4 }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Error */}
      {error && (
        <p
          className="mb-4 rounded-lg border px-3 py-2 font-mono text-xs"
          style={{
            borderColor: 'color-mix(in srgb, #ef4444 40%, transparent)',
            color: '#ef4444',
            background: 'color-mix(in srgb, #ef4444 8%, transparent)',
          }}
        >
          {error}
        </p>
      )}

      {/* Description */}
      {description && !error && (
        <p className="mb-6 font-mono text-sm text-fg">
          <span className="text-muted">→ </span>{description}
        </p>
      )}

      {/* Next runs */}
      {runs.length > 0 && (
        <div>
          <div
            className="mb-3 border-b pb-2"
            style={{ borderColor: 'color-mix(in srgb, var(--color-fg) 12%, transparent)' }}
          >
            <span className="font-mono text-xs font-semibold text-fg">Next {runs.length} runs</span>
          </div>
          <ol className="space-y-2">
            {runs.map((date, i) => (
              <li key={i} className="flex items-center gap-3">
                <span
                  className="w-5 text-right font-mono text-xs"
                  style={{ color: 'var(--color-muted)' }}
                >
                  {i + 1}.
                </span>
                <span
                  className="rounded-lg border px-3 py-1.5 font-mono text-sm text-fg"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--color-fg) 12%, transparent)',
                    background: i === 0 ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)' : 'color-mix(in srgb, var(--color-fg) 3%, transparent)',
                  }}
                >
                  {date.toLocaleString('sv-SE').replace('T', ' ')}
                </span>
                {i === 0 && (
                  <span className="font-mono text-xs" style={{ color: 'var(--color-accent)' }}>
                    next
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </main>
  );
}
