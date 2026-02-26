# 0xjj.dev

JJ (Junya Kono) の個人サイト。

## Repository Structure

```
/
├── sites/
│   ├── 0xjj.dev/        ← Astro サイト本体
│   └── tools.0xjj.dev/  ← 開発者向けツール集
├── workers/
│   └── games/           ← 統合ゲームサーバー (games-api.0xjj.dev)
└── scripts/
    └── generate-ogp/    ← OGP 背景画像生成スクリプト (Go)
```

## Sites

### [sites/0xjj.dev](./sites/0xjj.dev)

Astro 5 + Tailwind CSS v4 + Cloudflare Workers で構築された本番サイト。

```sh
cd sites/0xjj.dev
bun install
bun dev
```

### [sites/tools.0xjj.dev](./sites/tools.0xjj.dev)

Next.js 15 + Tailwind CSS v4 + Cloudflare Workers で構築された便利ツール集。

```sh
cd sites/tools.0xjj.dev
bun install
bun dev
```

## Workers

### [workers/games](./workers/games)

統合ゲームサーバー。1つの Worker で複数のゲーム (Tic-Tac-Toe, Word Wolf, Connect Four, Reversi, Dots & Boxes) を提供。各ゲームは独立した Durable Object クラスで実装。

```sh
cd workers/games
bun install
npx wrangler dev     # ローカル開発
npx wrangler deploy  # デプロイ
```

## Scripts

### [scripts/generate-ogp](./scripts/generate-ogp)

ブログ記事の OGP 背景画像 (`public/og/bg/*.png`) を生成する Go スクリプト。
新しいブログ記事を追加したときに実行する。

```sh
cd scripts/generate-ogp
make gen
```
