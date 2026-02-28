# 0xjj.dev

JJ (Junya Kono) の個人サイト — v4。Astro 5 + Tailwind CSS v4 + Cloudflare Workers で構築。

## Stack

- **Astro 5** — 静的サイト生成
- **React 19** (`@astrojs/react`) — インタラクティブコンポーネント
- **Tailwind CSS v4** (`@tailwindcss/vite`) — スタイリング
- **Cloudflare Workers** (static assets + Worker hybrid) — ホスティング
- **Cloudflare KV** (`BLOG_VIEWS`) — ブログ記事の閲覧数ストレージ

## Project Structure

```
worker/
└── index.ts         # Worker API (ブログ閲覧数 KV エンドポイント)
src/
├── assets/          # SVG アセット
├── components/      # Astro / React コンポーネント
│   ├── Hero.astro
│   ├── Skills.astro
│   ├── Timeline.astro
│   ├── TimelineEntry.astro
│   └── Signature.tsx
├── content/         # コンテンツコレクション
│   ├── blog/        # ブログ記事 (Markdown)
│   ├── config.ts    # コレクションスキーマ定義
│   ├── project.yaml
│   ├── skills.yaml
│   └── work.yaml
├── layouts/
│   └── Layout.astro
├── lib/
│   └── reading-time.ts
├── pages/
│   ├── index.astro
│   ├── blog/
│   │   ├── index.astro   # 検索付きブログ一覧
│   │   └── [slug].astro  # ブログ記事ページ
│   ├── og/
│   │   └── [slug].png.ts # 動的 OGP 画像生成
│   └── rss.xml.ts
├── plugins/         # カスタム remark/rehype プラグイン
└── styles/
    └── global.css   # Tailwind + CSS カスタムプロパティ
```

## Commands

```sh
bun dev        # 開発サーバー起動 (localhost:4321)
bun run build  # プロダクションビルド → ./dist/
bun run preview # ビルド結果のローカルプレビュー
wrangler deploy # Cloudflare Workers へデプロイ
```

## OGP Images

ブログ記事の OGP 画像 (`/og/[slug].png`) はビルド時に動的生成:

- **背景画像**: `public/og/bg/[slug].png` — リポジトリルートの `scripts/generate-ogp/` にある Go スクリプトで生成 (`make gen`)
- **レンダリング**: `satori` (HTML → SVG) + `@resvg/resvg-wasm` (SVG → PNG)

新しいブログ記事を追加した際は `scripts/generate-ogp/` で `make gen` を実行すること。

## Blog View Tracking

ブログ記事の閲覧数を Cloudflare KV で追跡し、ブログ一覧に人気記事 Top 3 を表示する。

- **構成**: Static assets + Worker hybrid — `wrangler.jsonc` の `run_worker_first: ["/api/*"]` で `/api/*` のみ Worker を経由
- **Worker API** (`worker/index.ts`):
  - `POST /api/views/:slug` — 閲覧数 +1
  - `GET /api/views/top` — Top 3 記事を JSON で返却
  - `GET /api/views/:slug` — 単一記事の閲覧数を返却
- **KV**: `BLOG_VIEWS` ネームスペース — slug ごとのカウント + `_top` インデックスキー

## RSS

`/rss.xml` で RSS フィードを配信。
