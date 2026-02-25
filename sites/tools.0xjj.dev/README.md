# tools.0xjj.dev

便利ツール集。Next.js 15 + Tailwind CSS v4 + Cloudflare Workers で構築。

**URL**: https://tools.0xjj.dev

## Tools

| Tool | URL | 概要 |
|---|---|---|
| OGP Checker | https://tools.0xjj.dev/ogpchecker | 任意の URL の Open Graph / Twitter Card などのメタ情報を取得・一覧表示するツール |

### OGP Checker

URL を入力すると、そのページのメタタグをサーバーサイドで取得して表示する。

- `og:*` / `article:*` などの Open Graph タグ
- `twitter:*` Twitter / X Card タグ
- `description` / `keywords` などの標準メタタグ
- `<link rel="...">` の canonical・icon などのリンクタグ
- `og:image` / `twitter:image` などの画像は実際にプレビュー表示
- シェア時のプレビューカードも確認できる

## Development

```sh
bun dev          # 開発サーバー起動 (localhost:3000)
bun run build    # Next.js ビルド
bun run build:opennext  # Cloudflare Workers 向けビルド
bun run preview  # ローカルで Workers をプレビュー
bun run deploy   # Cloudflare Workers へデプロイ
bun run cf-typegen  # Cloudflare 環境変数の型生成
```

## Stack

- **Next.js 15** App Router
- **React 19**
- **Tailwind CSS v4** (PostCSS plugin)
- **@opennextjs/cloudflare** — Cloudflare Workers へのデプロイアダプター
- **Wrangler** — Cloudflare Workers CLI
