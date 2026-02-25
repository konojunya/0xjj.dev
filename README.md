# 0xjj.dev

JJ (Junya Kono) の個人サイト。

## Repository Structure

```
/
├── sites/
│   ├── 0xjj.dev/        ← Astro サイト本体
│   └── tools.0xjj.dev/  ← 開発者向けツール集
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

## Scripts

### [scripts/generate-ogp](./scripts/generate-ogp)

ブログ記事の OGP 背景画像 (`public/og/bg/*.png`) を生成する Go スクリプト。
新しいブログ記事を追加したときに実行する。

```sh
cd scripts/generate-ogp
make gen
```
