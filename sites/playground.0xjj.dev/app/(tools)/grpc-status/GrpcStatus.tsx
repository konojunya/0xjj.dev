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
    description: 'オペレーションが正常に完了しました。',
    category: 'ok',
  },
  {
    code: 1,
    name: 'CANCELLED',
    httpEquivalent: 499,
    description: 'オペレーションがキャンセルされました（通常は呼び出し元によるキャンセル）。',
    category: 'client',
  },
  {
    code: 2,
    name: 'UNKNOWN',
    httpEquivalent: 500,
    description: '不明なエラー。別の空間のステータスコードを受信した場合などに使用されます。',
    category: 'server',
  },
  {
    code: 3,
    name: 'INVALID_ARGUMENT',
    httpEquivalent: 400,
    description: 'クライアントが無効な引数を指定しました。FAILED_PRECONDITIONとは異なり、システムの状態に関係なく引数自体に問題があることを示します。',
    category: 'client',
  },
  {
    code: 4,
    name: 'DEADLINE_EXCEEDED',
    httpEquivalent: 504,
    description: 'オペレーションが完了する前にデッドラインが超過しました。システム状態を変更するオペレーションでは、成功していてもこのコードが返される場合があります。',
    category: 'client',
  },
  {
    code: 5,
    name: 'NOT_FOUND',
    httpEquivalent: 404,
    description: '要求されたエンティティが見つかりません。プライバシー保護のため、呼び出し元にエンティティの閲覧権限がない場合にもこのコードが返されることがあります。',
    category: 'client',
  },
  {
    code: 6,
    name: 'ALREADY_EXISTS',
    httpEquivalent: 409,
    description: 'クライアントが作成しようとしたエンティティが既に存在します。',
    category: 'client',
  },
  {
    code: 7,
    name: 'PERMISSION_DENIED',
    httpEquivalent: 403,
    description: '呼び出し元にオペレーションの実行権限がありません。UNAUTHENTICATEDとは異なり、呼び出し元の身元は確認済みですが、認可されていません。',
    category: 'client',
  },
  {
    code: 8,
    name: 'RESOURCE_EXHAUSTED',
    httpEquivalent: 429,
    description: 'リソースが枯渇しました（ユーザーごとのクォータ超過やファイルシステムの容量不足など）。',
    category: 'client',
  },
  {
    code: 9,
    name: 'FAILED_PRECONDITION',
    httpEquivalent: 400,
    description: 'システムがオペレーションの実行に必要な状態にないため、拒否されました。例：空でないディレクトリの削除。',
    category: 'client',
  },
  {
    code: 10,
    name: 'ABORTED',
    httpEquivalent: 409,
    description: 'オペレーションが中止されました。シーケンサーチェックの失敗やトランザクションの中止など、並行処理の問題が原因です。',
    category: 'client',
  },
  {
    code: 11,
    name: 'OUT_OF_RANGE',
    httpEquivalent: 400,
    description: '有効な範囲を超えてオペレーションが試行されました。INVALID_ARGUMENTとは異なり、システム状態の変化により解決する可能性があります。',
    category: 'client',
  },
  {
    code: 12,
    name: 'UNIMPLEMENTED',
    httpEquivalent: 501,
    description: 'オペレーションが実装されていないか、このサービスではサポート・有効化されていません。',
    category: 'server',
  },
  {
    code: 13,
    name: 'INTERNAL',
    httpEquivalent: 500,
    description: '内部エラー。基盤となるシステムが期待する不変条件が破られたことを意味します。',
    category: 'server',
  },
  {
    code: 14,
    name: 'UNAVAILABLE',
    httpEquivalent: 503,
    description: 'サービスが現在利用できません。多くの場合一時的な状態であり、バックオフ付きのリトライで回復する可能性があります。',
    category: 'server',
  },
  {
    code: 15,
    name: 'DATA_LOSS',
    httpEquivalent: 500,
    description: '回復不能なデータの損失または破損が発生しました。',
    category: 'server',
  },
  {
    code: 16,
    name: 'UNAUTHENTICATED',
    httpEquivalent: 401,
    description: 'リクエストに、オペレーションに必要な有効な認証情報がありません。',
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
  client: 'クライアントエラー',
  server: 'サーバーエラー',
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
        全{GRPC_CODES.length}件のgRPCステータスコードをHTTP対応表付きで一覧できます。
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="コード・名前・説明で検索..."
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
              {f === 'all' ? 'すべて' : f === 'ok' ? 'OK' : f === 'client' ? 'クライアント' : 'サーバー'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)' }}>
            「{search}」に一致する結果はありません
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
