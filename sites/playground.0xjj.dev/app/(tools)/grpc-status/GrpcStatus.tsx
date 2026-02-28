'use client';

import { useState } from 'react';

type Category = 'ok' | 'client' | 'server';

interface GrpcCode {
  code: number;
  name: string;
  httpEquivalent: number;
  description: string;
  category: Category;
}

const GRPC_CODES: GrpcCode[] = [
  {
    code: 0,
    name: 'OK',
    httpEquivalent: 200,
    description: 'The operation completed successfully.',
    category: 'ok',
  },
  {
    code: 1,
    name: 'CANCELLED',
    httpEquivalent: 499,
    description: 'The operation was cancelled, typically by the caller.',
    category: 'client',
  },
  {
    code: 2,
    name: 'UNKNOWN',
    httpEquivalent: 500,
    description: 'Unknown error. May be used when status codes from another space are received.',
    category: 'server',
  },
  {
    code: 3,
    name: 'INVALID_ARGUMENT',
    httpEquivalent: 400,
    description: 'The client specified an invalid argument. Differs from FAILED_PRECONDITION — INVALID_ARGUMENT indicates arguments problematic regardless of system state.',
    category: 'client',
  },
  {
    code: 4,
    name: 'DEADLINE_EXCEEDED',
    httpEquivalent: 504,
    description: 'The deadline expired before the operation could complete. For operations that change the system state, this may be returned even if the operation completed successfully.',
    category: 'client',
  },
  {
    code: 5,
    name: 'NOT_FOUND',
    httpEquivalent: 404,
    description: 'Some requested entity was not found. For privacy, this code may be returned when the caller lacks permission to see the entity.',
    category: 'client',
  },
  {
    code: 6,
    name: 'ALREADY_EXISTS',
    httpEquivalent: 409,
    description: 'The entity that a client attempted to create already exists.',
    category: 'client',
  },
  {
    code: 7,
    name: 'PERMISSION_DENIED',
    httpEquivalent: 403,
    description: 'The caller does not have permission to execute the operation. Unlike UNAUTHENTICATED, the caller is identified but lacks authorization.',
    category: 'client',
  },
  {
    code: 8,
    name: 'RESOURCE_EXHAUSTED',
    httpEquivalent: 429,
    description: 'Some resource has been exhausted, such as a per-user quota or the entire file system is out of space.',
    category: 'client',
  },
  {
    code: 9,
    name: 'FAILED_PRECONDITION',
    httpEquivalent: 400,
    description: 'The operation was rejected because the system is not in a state required for execution. E.g., deleting a non-empty directory.',
    category: 'client',
  },
  {
    code: 10,
    name: 'ABORTED',
    httpEquivalent: 409,
    description: 'The operation was aborted, typically due to a concurrency issue such as a sequencer check failure or transaction abort.',
    category: 'client',
  },
  {
    code: 11,
    name: 'OUT_OF_RANGE',
    httpEquivalent: 400,
    description: 'The operation was attempted past the valid range. Unlike INVALID_ARGUMENT, this error indicates a problem that may be fixed if the system state changes.',
    category: 'client',
  },
  {
    code: 12,
    name: 'UNIMPLEMENTED',
    httpEquivalent: 501,
    description: 'The operation is not implemented or is not supported/enabled in this service.',
    category: 'server',
  },
  {
    code: 13,
    name: 'INTERNAL',
    httpEquivalent: 500,
    description: 'Internal errors. This means some invariant expected by the underlying system has been broken.',
    category: 'server',
  },
  {
    code: 14,
    name: 'UNAVAILABLE',
    httpEquivalent: 503,
    description: 'The service is currently unavailable. This is most likely a transient condition that can be corrected by retrying with a backoff.',
    category: 'server',
  },
  {
    code: 15,
    name: 'DATA_LOSS',
    httpEquivalent: 500,
    description: 'Unrecoverable data loss or corruption.',
    category: 'server',
  },
  {
    code: 16,
    name: 'UNAUTHENTICATED',
    httpEquivalent: 401,
    description: 'The request does not have valid authentication credentials for the operation.',
    category: 'client',
  },
];

const CATEGORY_COLORS: Record<Category | 'all', string> = {
  all: '#6366f1',
  ok: '#22c55e',
  client: '#f97316',
  server: '#ef4444',
};

const CATEGORY_LABELS: Record<Category, string> = {
  ok: 'OK',
  client: 'Client error',
  server: 'Server error',
};

type Filter = 'all' | Category;

export default function GrpcStatus() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = GRPC_CODES.filter((s) => {
    const matchesCategory = filter === 'all' || s.category === filter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      s.code.toString().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-fg)', marginBottom: '0.25rem' }}>
        gRPC Status Codes
      </h1>
      <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Browse all {GRPC_CODES.length} gRPC status codes with HTTP equivalents.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by code, name, or description…"
          style={{
            flex: 1,
            minWidth: 200,
            padding: '0.5rem 0.75rem',
            borderRadius: 8,
            border: '1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)',
            background: 'color-mix(in srgb, var(--color-fg) 5%, transparent)',
            color: 'var(--color-fg)',
            fontSize: '0.875rem',
            outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {(['all', 'ok', 'client', 'server'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: 8,
                border: '1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)',
                background: filter === f ? CATEGORY_COLORS[f] : 'transparent',
                color: filter === f ? '#fff' : 'var(--color-muted)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: filter === f ? 600 : 400,
                whiteSpace: 'nowrap',
              }}
            >
              {f === 'all' ? 'All' : f === 'ok' ? 'OK' : f === 'client' ? 'Client' : 'Server'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)' }}>
            No results for &quot;{search}&quot;
          </div>
        ) : (
          filtered.map((s) => {
            const color = CATEGORY_COLORS[s.category];
            return (
              <div
                key={s.code}
                style={{
                  display: 'flex',
                  gap: '1rem',
                  padding: '0.85rem 1rem',
                  borderRadius: 8,
                  border: '1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)',
                  background: 'color-mix(in srgb, var(--color-fg) 2%, transparent)',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ minWidth: 28, textAlign: 'right' }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fontSize: '1rem',
                      color,
                    }}
                  >
                    {s.code}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-fg)', fontSize: '0.9rem' }}>
                      {s.name}
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '0.1rem 0.45rem',
                      borderRadius: 4,
                      background: `color-mix(in srgb, ${color} 15%, transparent)`,
                      color,
                      fontWeight: 600,
                    }}>
                      {CATEGORY_LABELS[s.category]}
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '0.1rem 0.45rem',
                      borderRadius: 4,
                      border: '1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)',
                      color: 'var(--color-muted)',
                      fontFamily: 'monospace',
                    }}>
                      HTTP {s.httpEquivalent}
                    </span>
                  </div>
                  <div style={{ color: 'var(--color-muted)', fontSize: '0.825rem', lineHeight: 1.5 }}>
                    {s.description}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
