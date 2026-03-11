'use client';

import { useState } from 'react';

interface StatusCode {
  code: number;
  name: string;
  description: string;
}

const STATUS_CODES: StatusCode[] = [
  // 1xx
  { code: 100, name: 'Continue', description: 'サーバーがリクエストヘッダーを受信し、クライアントはリクエストボディの送信を続行すべきです。' },
  { code: 101, name: 'Switching Protocols', description: 'クライアントの要求に応じて、サーバーがプロトコルを切り替えます。' },
  { code: 102, name: 'Processing', description: 'サーバーがリクエストを受信し処理中ですが、まだレスポンスを返せる状態ではありません。' },
  { code: 103, name: 'Early Hints', description: '最終的なHTTPレスポンスの前に、一部のレスポンスヘッダーを先行して返します。' },
  // 2xx
  { code: 200, name: 'OK', description: 'リクエストが成功しました。' },
  { code: 201, name: 'Created', description: 'リクエストが成功し、新しいリソースが作成されました。' },
  { code: 202, name: 'Accepted', description: 'リクエストは受理されましたが、処理はまだ完了していません。' },
  { code: 203, name: 'Non-Authoritative Information', description: 'サーバーはオリジンから200 OKを受け取りましたが、変換プロキシとしてレスポンスを改変して返しています。' },
  { code: 204, name: 'No Content', description: 'リクエストは正常に処理されましたが、返すコンテンツはありません。' },
  { code: 205, name: 'Reset Content', description: 'リクエストは正常に処理されましたが、コンテンツは返さず、クライアントにドキュメントビューのリセットを要求します。' },
  { code: 206, name: 'Partial Content', description: 'クライアントが送信したRangeヘッダーにより、リソースの一部のみを返しています。' },
  { code: 207, name: 'Multi-Status', description: '複数のリソースに関する情報を伝達します。複数のステータスコードが適切な状況で使用されます。' },
  { code: 208, name: 'Already Reported', description: 'DAVのpropstat要素内で、同一コレクションへの複数バインディングの内部メンバーを重複して列挙しないために使用されます。' },
  { code: 226, name: 'IM Used', description: 'サーバーがリソースのリクエストを処理し、現在のインスタンスに1つ以上のインスタンス操作を適用した結果を返しています。' },
  // 3xx
  { code: 300, name: 'Multiple Choices', description: 'リソースに対して複数の選択肢があり、クライアントがいずれかを選択できます。' },
  { code: 301, name: 'Moved Permanently', description: 'このリクエストおよび以降のすべてのリクエストは、指定されたURIに転送されるべきです。' },
  { code: 302, name: 'Found', description: 'リソースは見つかりましたが、別のURIにあります。一時的なリダイレクトです。' },
  { code: 303, name: 'See Other', description: 'レスポンスは別のURIにGETメソッドでアクセスすることで取得できます。' },
  { code: 304, name: 'Not Modified', description: 'リクエストヘッダーで指定されたバージョン以降、リソースは変更されていません。' },
  { code: 307, name: 'Temporary Redirect', description: '別のURIでリクエストを再送すべきですが、将来のリクエストでは元のURIを使い続けるべきです。' },
  { code: 308, name: 'Permanent Redirect', description: 'このリクエストおよび以降のすべてのリクエストは、別のURIで再送されるべきです。' },
  // 4xx
  { code: 400, name: 'Bad Request', description: 'クライアントのエラー（不正な構文など）により、サーバーがリクエストを処理できません。' },
  { code: 401, name: 'Unauthorized', description: '認証が必要です。クライアントはリクエストの応答を得るために認証を行う必要があります。' },
  { code: 402, name: 'Payment Required', description: '将来の使用のために予約されています。元々はデジタル決済システム向けに設計されました。' },
  { code: 403, name: 'Forbidden', description: 'クライアントにはコンテンツへのアクセス権がありません。' },
  { code: 404, name: 'Not Found', description: 'サーバーは要求されたリソースを見つけることができません。' },
  { code: 405, name: 'Method Not Allowed', description: '要求されたリソースに対して、このHTTPメソッドは許可されていません。' },
  { code: 406, name: 'Not Acceptable', description: 'リクエストヘッダーで定義された受入可能な値のリストに一致するレスポンスをサーバーが生成できません。' },
  { code: 407, name: 'Proxy Authentication Required', description: 'クライアントはまずプロキシで認証を行う必要があります。' },
  { code: 408, name: 'Request Timeout', description: 'サーバーが使用されていない接続を閉じようとしています。' },
  { code: 409, name: 'Conflict', description: 'リクエストがサーバーの現在の状態と競合しています。' },
  { code: 410, name: 'Gone', description: '要求されたコンテンツはサーバーから完全に削除されており、転送先もありません。' },
  { code: 411, name: 'Length Required', description: 'Content-Lengthヘッダーが定義されていないため、サーバーがリクエストを拒否しました。' },
  { code: 412, name: 'Precondition Failed', description: 'クライアントがヘッダーで指定した前提条件をサーバーが満たしていません。' },
  { code: 413, name: 'Content Too Large', description: 'リクエストエンティティがサーバーの定義する上限を超えています。' },
  { code: 414, name: 'URI Too Long', description: 'クライアントが要求したURIが、サーバーが解釈可能な長さを超えています。' },
  { code: 415, name: 'Unsupported Media Type', description: '要求されたデータのメディア形式がサーバーでサポートされていません。' },
  { code: 416, name: 'Range Not Satisfiable', description: 'Rangeヘッダーで指定された範囲を満たすことができません。' },
  { code: 417, name: 'Expectation Failed', description: 'Expectリクエストヘッダーで示された期待値をサーバーが満たすことができません。' },
  { code: 418, name: "I'm a Teapot", description: 'サーバーはティーポットでコーヒーを淹れる試みを拒否します。（RFC 2324）' },
  { code: 421, name: 'Misdirected Request', description: 'リクエストが、レスポンスを生成できないサーバーに向けられました。' },
  { code: 422, name: 'Unprocessable Content', description: 'リクエストの形式は正しいですが、意味的なエラーにより処理できません。' },
  { code: 423, name: 'Locked', description: 'アクセスしようとしているリソースがロックされています。' },
  { code: 424, name: 'Failed Dependency', description: '前のリクエストの失敗により、このリクエストも失敗しました。' },
  { code: 425, name: 'Too Early', description: 'リプレイされる可能性のあるリクエストの処理を、サーバーが拒否しています。' },
  { code: 426, name: 'Upgrade Required', description: '現在のプロトコルでのリクエスト実行をサーバーが拒否していますが、クライアントが別のプロトコルにアップグレードすれば対応可能です。' },
  { code: 428, name: 'Precondition Required', description: 'オリジンサーバーは、リクエストに条件付きヘッダーを含めることを要求しています。' },
  { code: 429, name: 'Too Many Requests', description: 'ユーザーが一定時間内に送信したリクエストが多すぎます。' },
  { code: 431, name: 'Request Header Fields Too Large', description: 'ヘッダーフィールドが大きすぎるため、サーバーがリクエストの処理を拒否しています。' },
  { code: 451, name: 'Unavailable For Legal Reasons', description: '法的な理由により提供できないリソースがリクエストされました（政府による検閲など）。' },
  // 5xx
  { code: 500, name: 'Internal Server Error', description: 'サーバーが処理方法を把握できない状況に遭遇しました。' },
  { code: 501, name: 'Not Implemented', description: 'リクエストメソッドがサーバーでサポートされておらず、処理できません。' },
  { code: 502, name: 'Bad Gateway', description: 'ゲートウェイとして動作しているサーバーが、不正なレスポンスを受け取りました。' },
  { code: 503, name: 'Service Unavailable', description: 'メンテナンスや過負荷などの理由で、サーバーがリクエストを処理する準備ができていません。' },
  { code: 504, name: 'Gateway Timeout', description: 'ゲートウェイとして動作しているサーバーが、時間内にレスポンスを取得できませんでした。' },
  { code: 505, name: 'HTTP Version Not Supported', description: 'リクエストで使用されたHTTPバージョンがサーバーでサポートされていません。' },
  { code: 506, name: 'Variant Also Negotiates', description: 'サーバーに内部的な設定エラーがあります。' },
  { code: 507, name: 'Insufficient Storage', description: 'リクエストの完了に必要なデータを保存するためのストレージが不足しています。' },
  { code: 508, name: 'Loop Detected', description: 'リクエストの処理中にサーバーが無限ループを検出しました。' },
  { code: 510, name: 'Not Extended', description: 'サーバーがリクエストを処理するために、リクエストにさらなる拡張が必要です。' },
  { code: 511, name: 'Network Authentication Required', description: 'ネットワークにアクセスするために、クライアントの認証が必要です。' },
];

type Category = 'all' | '1xx' | '2xx' | '3xx' | '4xx' | '5xx';

const CATEGORY_COLORS: Record<string, string> = {
  '1xx': '#6366f1',
  '2xx': '#22c55e',
  '3xx': '#f59e0b',
  '4xx': '#f97316',
  '5xx': '#ef4444',
};

function getCategory(code: number): string {
  return `${Math.floor(code / 100)}xx`;
}

export default function HttpStatus() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('all');

  const filtered = STATUS_CODES.filter((s) => {
    const matchesCategory = category === 'all' || getCategory(s.code) === category;
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
        HTTP Status Codes
      </h1>
      <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        {STATUS_CODES.length}件のHTTPステータスコードを番号やキーワードで検索できます。
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
          {(['all', '1xx', '2xx', '3xx', '4xx', '5xx'] as Category[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: 8,
                border: '1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)',
                background:
                  category === cat
                    ? cat === 'all'
                      ? 'var(--color-accent)'
                      : CATEGORY_COLORS[cat]
                    : 'transparent',
                color: category === cat ? '#fff' : 'var(--color-muted)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                fontWeight: category === cat ? 600 : 400,
              }}
            >
              {cat}
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
            const cat = getCategory(s.code);
            const color = CATEGORY_COLORS[cat];
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
                <span
                  style={{
                    minWidth: 48,
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '1rem',
                    color,
                  }}
                >
                  {s.code}
                </span>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--color-fg)', marginBottom: '0.2rem', fontSize: '0.9rem' }}>
                    {s.name}
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
