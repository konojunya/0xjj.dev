# tools.0xjj.dev

便利ツール集。Next.js 15 + Tailwind CSS v4 + Cloudflare Workers で構築。

**URL**: https://tools.0xjj.dev

## Tools

ツールを追加するときは、下のテーブルに行を追加し、対応するセクションを `## Tools` 内に追記する。

| slug | Tool | URL |
|---|---|---|
| `ogpchecker` | OGP Checker | https://tools.0xjj.dev/ogpchecker |

---

### OGP Checker

> URL を入力すると、そのページのメタタグをサーバーサイドで取得・一覧表示する。

- `og:*` / `article:*` などの Open Graph タグ
- `twitter:*` Twitter / X Card タグ
- `description` / `keywords` などの標準メタタグ
- `<link rel="...">` の canonical・icon などのリンクタグ
- `og:image` / `twitter:image` などの画像は実際にプレビュー表示
- シェア時のプレビューカードも確認できる

**Route**: `app/ogpchecker/`
**API**: `GET /api/meta?url=<url>`

---

<!--
新しいツールを追加する場合のテンプレート:

### ツール名

> 一行の説明。

- 機能の箇条書き

**Route**: `app/<slug>/`
**API**: (あれば)

---
-->

## Adding a New Tool

1. `app/lib/tools.ts` の `tools` 配列にエントリを追加
2. `app/<slug>/page.tsx` と必要なコンポーネントを作成
3. `app/<slug>/OgpChecker.tsx` を参考に `← back` リンクをページ先頭に置く
4. `app/<slug>/opengraph-image.tsx` で OGP 画像を生成
5. このREADMEのテーブルとセクションを追記

## Development

```sh
bun dev                 # 開発サーバー起動 (localhost:3000)
bun run build           # Next.js ビルド
bun run build:opennext  # Cloudflare Workers 向けビルド
bun run preview         # ローカルで Workers をプレビュー
bun run deploy          # Cloudflare Workers へデプロイ
bun run cf-typegen      # Cloudflare 環境変数の型生成
```

## Stack

- **Next.js 15** App Router
- **React 19**
- **Tailwind CSS v4** (PostCSS plugin)
- **@opennextjs/cloudflare** — Cloudflare Workers へのデプロイアダプター
- **Wrangler** — Cloudflare Workers CLI
