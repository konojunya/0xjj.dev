# tools.0xjj.dev

便利ツール集。Next.js 15 + Tailwind CSS v4 + Cloudflare Workers で構築。

**URL**: https://tools.0xjj.dev

## Tools

ツールを追加するときは、下のテーブルに行を追加し、対応するセクションを `## Tools` 内に追記する。

| slug | Tool | URL |
|---|---|---|
| `ogpchecker` | OGP Checker | https://tools.0xjj.dev/ogpchecker |
| `exif` | EXIF Viewer | https://tools.0xjj.dev/exif |
| `ratio` | Ratio Calculator | https://tools.0xjj.dev/ratio |

---

### Ratio Calculator

> 比率の簡略化と、比率と片方の値からもう片方を計算する。純粋なクライアントサイド計算。

- Simplify: a と b を入力 → GCD で割り算し最小整数比を表示（例: 1920:1080 → 16:9）
- Calculate: 比率と a か b の一方を入力 → もう一方をリアルタイム計算
- 小数の場合は切り上げ・切り下げも表示

**Route**: `app/ratio/`

---

### EXIF Viewer

> 画像（JPEG/TIFF/PNG/HEIC/AVIF/WebP）と PDF のメタデータ（EXIF/XMP/IPTC）を抽出・表示する。ファイルはクライアントサイドのみで処理（サーバーへのアップロード不要）。

- EXIF: Camera, Image, Exposure, Date/Time, GPS セクション
- PDF: Page Count, Page Size, Title/Author/Subject/Keywords/Creator/Producer/Date
- ドラッグ&ドロップ + クリックアップロード対応
- ファイルはブラウザ内のみで処理（プライバシー配慮）

**Route**: `app/exif/`

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
