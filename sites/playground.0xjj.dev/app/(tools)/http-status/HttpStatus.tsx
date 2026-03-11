'use client';

import { useState } from 'react';

interface StatusCode {
  code: number;
  name: string;
  description: string;
}

const STATUS_CODES: StatusCode[] = [
  // 1xx
  { code: 100, name: 'Continue', description: 'The server has received the request headers and the client should proceed.' },
  { code: 101, name: 'Switching Protocols', description: 'The server is switching protocols as requested by the client.' },
  { code: 102, name: 'Processing', description: 'The server has received and is processing the request, but no response is available yet.' },
  { code: 103, name: 'Early Hints', description: 'Used to return some response headers before final HTTP message.' },
  // 2xx
  { code: 200, name: 'OK', description: 'The request has succeeded.' },
  { code: 201, name: 'Created', description: 'The request has succeeded and a new resource has been created.' },
  { code: 202, name: 'Accepted', description: 'The request has been accepted for processing, but the processing has not been completed.' },
  { code: 203, name: 'Non-Authoritative Information', description: 'The server is a transforming proxy that received a 200 OK from its origin, but is returning a modified version of the response.' },
  { code: 204, name: 'No Content', description: 'The server successfully processed the request but is not returning any content.' },
  { code: 205, name: 'Reset Content', description: 'The server successfully processed the request and is not returning any content, and requires the requester to reset the document view.' },
  { code: 206, name: 'Partial Content', description: 'The server is delivering only part of the resource due to a range header sent by the client.' },
  { code: 207, name: 'Multi-Status', description: 'Conveys information about multiple resources, for situations where multiple status codes might be appropriate.' },
  { code: 208, name: 'Already Reported', description: 'Used inside a DAV: propstat element to avoid enumerating the internal members of multiple bindings to the same collection repeatedly.' },
  { code: 226, name: 'IM Used', description: 'The server has fulfilled a request for the resource, and the response is a representation of the result of one or more instance-manipulations applied to the current instance.' },
  // 3xx
  { code: 300, name: 'Multiple Choices', description: 'There are multiple options for the resource that the client may follow.' },
  { code: 301, name: 'Moved Permanently', description: 'This and all future requests should be directed to the given URI.' },
  { code: 302, name: 'Found', description: 'The resource was found, but at a different URI. This is a temporary redirect.' },
  { code: 303, name: 'See Other', description: 'The response can be found at another URI using a GET method.' },
  { code: 304, name: 'Not Modified', description: 'The resource has not been modified since the version specified by the request headers.' },
  { code: 307, name: 'Temporary Redirect', description: 'The request should be repeated with another URI, but future requests should still use the original URI.' },
  { code: 308, name: 'Permanent Redirect', description: 'The request and all future requests should be repeated using another URI.' },
  // 4xx
  { code: 400, name: 'Bad Request', description: 'The server cannot process the request due to client error (malformed syntax).' },
  { code: 401, name: 'Unauthorized', description: 'Authentication is required. The client must authenticate itself to get the requested response.' },
  { code: 402, name: 'Payment Required', description: 'Reserved for future use. Originally intended for digital payment systems.' },
  { code: 403, name: 'Forbidden', description: 'The client does not have access rights to the content.' },
  { code: 404, name: 'Not Found', description: 'The server can not find the requested resource.' },
  { code: 405, name: 'Method Not Allowed', description: 'The HTTP method is not allowed for the requested resource.' },
  { code: 406, name: 'Not Acceptable', description: 'The server cannot produce a response matching the list of acceptable values defined in the request headers.' },
  { code: 407, name: 'Proxy Authentication Required', description: 'The client must first authenticate itself with the proxy.' },
  { code: 408, name: 'Request Timeout', description: 'The server would like to shut down this unused connection.' },
  { code: 409, name: 'Conflict', description: 'The request conflicts with the current state of the server.' },
  { code: 410, name: 'Gone', description: 'The requested content has been permanently deleted from server, with no forwarding address.' },
  { code: 411, name: 'Length Required', description: 'The server rejects the request because the Content-Length header field is not defined.' },
  { code: 412, name: 'Precondition Failed', description: 'The client has indicated preconditions in its headers which the server does not meet.' },
  { code: 413, name: 'Content Too Large', description: 'The request entity is larger than limits defined by server.' },
  { code: 414, name: 'URI Too Long', description: 'The URI requested by the client is longer than the server is willing to interpret.' },
  { code: 415, name: 'Unsupported Media Type', description: 'The media format of the requested data is not supported by the server.' },
  { code: 416, name: 'Range Not Satisfiable', description: 'The range specified by the Range header field cannot be fulfilled.' },
  { code: 417, name: 'Expectation Failed', description: 'The expectation indicated by the Expect request header cannot be met by the server.' },
  { code: 418, name: "I'm a Teapot", description: 'The server refuses the attempt to brew coffee with a teapot. (RFC 2324)' },
  { code: 421, name: 'Misdirected Request', description: 'The request was directed at a server that is not able to produce a response.' },
  { code: 422, name: 'Unprocessable Content', description: 'The request was well-formed but was unable to be followed due to semantic errors.' },
  { code: 423, name: 'Locked', description: 'The resource that is being accessed is locked.' },
  { code: 424, name: 'Failed Dependency', description: 'The request failed due to failure of a previous request.' },
  { code: 425, name: 'Too Early', description: 'Indicates that the server is unwilling to risk processing a request that might be replayed.' },
  { code: 426, name: 'Upgrade Required', description: 'The server refuses to perform the request using the current protocol but will be willing to do so after the client upgrades to a different protocol.' },
  { code: 428, name: 'Precondition Required', description: 'The origin server requires the request to be conditional.' },
  { code: 429, name: 'Too Many Requests', description: 'The user has sent too many requests in a given amount of time.' },
  { code: 431, name: 'Request Header Fields Too Large', description: 'The server is unwilling to process the request because its header fields are too large.' },
  { code: 451, name: 'Unavailable For Legal Reasons', description: 'The user requested a resource that cannot legally be provided, such as a web page censored by a government.' },
  // 5xx
  { code: 500, name: 'Internal Server Error', description: 'The server has encountered a situation it does not know how to handle.' },
  { code: 501, name: 'Not Implemented', description: 'The request method is not supported by the server and cannot be handled.' },
  { code: 502, name: 'Bad Gateway', description: 'The server got an invalid response while working as a gateway to handle the response.' },
  { code: 503, name: 'Service Unavailable', description: 'The server is not ready to handle the request, often due to maintenance or overload.' },
  { code: 504, name: 'Gateway Timeout', description: 'The server is acting as a gateway and cannot get a response in time.' },
  { code: 505, name: 'HTTP Version Not Supported', description: 'The HTTP version used in the request is not supported by the server.' },
  { code: 506, name: 'Variant Also Negotiates', description: 'The server has an internal configuration error.' },
  { code: 507, name: 'Insufficient Storage', description: 'The server is unable to store the representation needed to complete the request.' },
  { code: 508, name: 'Loop Detected', description: 'The server detected an infinite loop while processing the request.' },
  { code: 510, name: 'Not Extended', description: 'Further extensions to the request are required for the server to fulfill it.' },
  { code: 511, name: 'Network Authentication Required', description: 'The client needs to authenticate to gain network access.' },
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
