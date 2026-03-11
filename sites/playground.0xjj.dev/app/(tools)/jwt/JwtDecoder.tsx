'use client';

import { useMemo, useState } from 'react';

interface ParsedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
}

function base64urlDecode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

function parseJwt(token: string): ParsedJwt | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(base64urlDecode(parts[0]));
    const payload = JSON.parse(base64urlDecode(parts[1]));
    return { header, payload, signature: parts[2] };
  } catch {
    return null;
  }
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }) + ' JST';
}

function relativeTime(ts: number): string {
  const diffSec = Math.floor(Date.now() / 1000) - ts;
  const abs = Math.abs(diffSec);
  const days = Math.floor(abs / 86400);
  const hours = Math.floor((abs % 86400) / 3600);
  const mins = Math.floor((abs % 3600) / 60);
  if (days > 0) return `${days}日`;
  if (hours > 0) return `${hours}時間`;
  return `${mins}分`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={copy}
      className="rounded px-2 py-0.5 font-mono text-xs transition-colors"
      style={{
        background: 'color-mix(in srgb, var(--color-fg) 8%, transparent)',
        color: 'var(--color-muted)',
      }}
    >
      {copied ? 'コピー済み!' : 'コピー'}
    </button>
  );
}

function Section({
  title,
  content,
  copyText,
  children,
}: {
  title: string;
  content: string;
  copyText: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div
        className="mb-1.5 flex items-center justify-between border-b pb-1"
        style={{ borderColor: 'color-mix(in srgb, var(--color-fg) 12%, transparent)' }}
      >
        <span className="font-mono text-xs font-semibold text-fg">{title}</span>
        <CopyButton text={copyText} />
      </div>
      <pre
        className="overflow-auto rounded-lg border px-3 py-2 font-mono text-sm text-fg"
        style={{
          borderColor: 'color-mix(in srgb, var(--color-fg) 12%, transparent)',
          background: 'color-mix(in srgb, var(--color-fg) 4%, transparent)',
        }}
      >
        <code>{content}</code>
      </pre>
      {children}
    </div>
  );
}

export default function JwtDecoder() {
  const [input, setInput] = useState('');

  const parsed = useMemo(() => {
    if (!input.trim()) return null;
    return parseJwt(input.trim());
  }, [input]);

  const now = Math.floor(Date.now() / 1000);

  const expInfo = useMemo(() => {
    if (!parsed?.payload?.exp) return null;
    const exp = parsed.payload.exp as number;
    const expired = now > exp;
    return { exp, expired, relative: relativeTime(exp) };
  }, [parsed, now]);

  return (
    <main className=" py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">JWT Decoder</h1>
        <p className="mt-1 text-sm text-muted">
          JWTのヘッダー・ペイロード・有効期限をデコードして確認します。
        </p>
      </div>

      {/* Input */}
      <div className="mb-6">
        <label className="mb-1.5 block font-mono text-xs text-muted">JWTトークン</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="JWTトークンをここに貼り付け..."
          rows={4}
          className="w-full rounded-lg border bg-transparent px-3 py-2 font-mono text-base text-fg outline-none transition-colors"
          style={{
            borderColor: input && !parsed
              ? 'color-mix(in srgb, #ef4444 60%, transparent)'
              : 'color-mix(in srgb, var(--color-fg) 12%, transparent)',
            resize: 'vertical',
          }}
          spellCheck={false}
        />
        {input && !parsed && (
          <p className="mt-2 font-mono text-xs" style={{ color: '#ef4444' }}>
            無効なJWT形式です。ドットで区切られた3つのbase64urlエンコード部分が必要です。
          </p>
        )}
      </div>

      {/* Decoded sections */}
      {parsed && (
        <div>
          <Section
            title="ヘッダー"
            content={JSON.stringify(parsed.header, null, 2)}
            copyText={JSON.stringify(parsed.header, null, 2)}
          />
          <Section
            title="ペイロード"
            content={JSON.stringify(parsed.payload, null, 2)}
            copyText={JSON.stringify(parsed.payload, null, 2)}
          >
            <div className="mt-2 space-y-1 font-mono text-xs text-muted">
              {expInfo && (
                <p>
                  <span className="mr-2">exp:</span>
                  <span>{formatDate(expInfo.exp)}</span>
                  <span
                    className="ml-2"
                    style={{ color: expInfo.expired ? '#ef4444' : '#22c55e' }}
                  >
                    ({expInfo.expired ? `${expInfo.relative}前に期限切れ` : `${expInfo.relative}後に期限切れ`})
                  </span>
                </p>
              )}
              {typeof parsed.payload.iat === 'number' && (
                <p>
                  <span className="mr-2">iat:</span>
                  <span>{formatDate(parsed.payload.iat)}</span>
                </p>
              )}
              {typeof parsed.payload.nbf === 'number' && (
                <p>
                  <span className="mr-2">nbf:</span>
                  <span>{formatDate(parsed.payload.nbf)}</span>
                </p>
              )}
            </div>
          </Section>
          <Section
            title="署名"
            content={parsed.signature}
            copyText={parsed.signature}
          />
        </div>
      )}
    </main>
  );
}
