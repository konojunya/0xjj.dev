# playground.0xjj.dev

ツール・ゲーム・実験場。Next.js 15 + Tailwind CSS v4 + Cloudflare Workers で構築。

**URL**: https://playground.0xjj.dev

## Tools

ツールを追加するときは、下のテーブルに行を追加し、対応するセクションを `## Tools` 内に追記する。

| slug | Tool | URL |
|---|---|---|
| `base64` | Base64 Encoder / Decoder | https://playground.0xjj.dev/base64 |
| `color` | Color Converter | https://playground.0xjj.dev/color |
| `cron` | Cron Expression Parser | https://playground.0xjj.dev/cron |
| `easing` | Easing Visualizer | https://playground.0xjj.dev/easing |
| `face-detect` | Face Detect Camera | https://playground.0xjj.dev/face-detect |
| `exif` | EXIF Viewer | https://playground.0xjj.dev/exif |
| `hash` | Hash Calculator | https://playground.0xjj.dev/hash |
| `json` | JSON Formatter | https://playground.0xjj.dev/json |
| `jwt` | JWT Decoder | https://playground.0xjj.dev/jwt |
| `base` | Number Base Converter | https://playground.0xjj.dev/base |
| `ogpchecker` | OGP Checker | https://playground.0xjj.dev/ogpchecker |
| `ratio` | Ratio Calculator | https://playground.0xjj.dev/ratio |
| `regex` | RegEx Tester | https://playground.0xjj.dev/regex |
| `uuid` | UUID Generator | https://playground.0xjj.dev/uuid |
| `2048` | 2048 | https://playground.0xjj.dev/2048 |
| `connect-four` | Connect Four | https://playground.0xjj.dev/connect-four |
| `dots-and-boxes` | Dots & Boxes | https://playground.0xjj.dev/dots-and-boxes |
| `reversi` | Reversi | https://playground.0xjj.dev/reversi |
| `tictactoe` | Tic-Tac-Toe | https://playground.0xjj.dev/tictactoe |
| `wordwolf` | Word Wolf | https://playground.0xjj.dev/wordwolf |
| `liquid-glass` | Liquid Glass | https://playground.0xjj.dev/liquid-glass |
| `tilt-card` | Tilt Card | https://playground.0xjj.dev/tilt-card |

---

### Base64 Encoder / Decoder

> テキストを Base64 にエンコード、または Base64 をテキストにデコードする。

- Encode / Decode の2モード
- UTF-8 対応（`encodeURIComponent` + `btoa`）
- URL-safe (base64url) オプション（`+`→`-`、`/`→`_`、`=` 除去）
- 不正入力のエラー表示

**Route**: `app/base64/`

---

### Color Converter

> HEX カラーコードを CSS で表現できるすべての色形式に変換する。純粋なクライアントサイド計算（外部ライブラリ不要）。

- CSS Legacy: HEX / HEX(alpha) / RGB / RGBA / HSL / HSLA
- CSS Color Level 4: RGB / HSL / HWB / LAB / LCH / OKLAB / OKLCH / color(srgb) / color(display-p3)
- デザインツール向け: HSV / CMYK
- カラーピッカー + テキスト入力が同期、コピーボタン付き
- #rgb・#rrggbb・#rgba・#rrggbbaa・大文字・# なしをすべて受け付ける

**Route**: `app/color/`

---

### Cron Expression Parser

> cron 式を解析し、次回実行予定時刻を一覧表示する。

- 5フィールド形式（minute / hour / day-of-month / month / day-of-week）
- `*` / 数値 / 範囲 (`1-5`) / リスト (`1,3,5`) / ステップ (`*/5`) をフルサポート
- 人間が読めるかんたんな説明文を生成
- 次回10件の実行時刻をプレビュー
- プリセット: Every minute / Every hour / Daily / Weekly / Monthly

**Route**: `app/cron/`

---

### Easing Visualizer

> cubic-bezier の4パラメータをリアルタイムで SVG 曲線プレビューし、CSS 値を生成する。

- de Casteljau アルゴリズムで100点サンプリングして SVG path を描画
- プリセット: `linear` / `ease` / `ease-in` / `ease-out` / `ease-in-out`
- Play ボタンでボールのアニメーションプレビュー
- `cubic-bezier(x1, y1, x2, y2)` のコピーボタン

**Route**: `app/easing/`

---

### Face Detect Camera

> Webカメラ映像を canvas に描画する。顔検出は次の段階で追加する。

- 開始ボタン押下後にのみ `getUserMedia()` を呼び出し、ブラウザの権限ダイアログを表示
- カメラ映像はブラウザ内のみで処理し、サーバーにアップロードしない
- hidden な `video` 要素から `canvas` へ毎フレーム描画
- 次の段階でこの canvas を入力にして face detect を載せる

**Route**: `app/face-detect/`

---

### EXIF Viewer

> 画像（JPEG/TIFF/PNG/HEIC/AVIF/WebP）と PDF のメタデータ（EXIF/XMP/IPTC）を抽出・表示する。ファイルはクライアントサイドのみで処理（サーバーへのアップロード不要）。

- EXIF: Camera, Image, Exposure, Date/Time, GPS セクション
- PDF: Page Count, Page Size, Title/Author/Subject/Keywords/Creator/Producer/Date
- ドラッグ&ドロップ + クリックアップロード対応
- ファイルはブラウザ内のみで処理（プライバシー配慮）

**Route**: `app/exif/`

---

### Hash Calculator

> テキストのハッシュ値を即時計算する。Web Crypto API (`crypto.subtle`) を使用。

- アルゴリズム: SHA-1 / SHA-256 / SHA-384 / SHA-512
- 入力と同時にすべてのアルゴリズムで並列計算
- 各ハッシュ値にコピーボタン

**Route**: `app/hash/`

---

### JSON Formatter

> JSON を貼り付けるとリアルタイムで pretty-print する。純粋なクライアントサイド処理。

- インデント選択: 2スペース / 4スペース / タブ
- Minify ボタン（改行・スペースを除去したコンパクト版を出力）
- SyntaxError のメッセージをリアルタイム表示
- コピーボタン

**Route**: `app/json/`

---

### JWT Decoder

> JWT トークンを Header / Payload / Signature の3セクションに分解する。外部依存なし。

- base64url デコードをピュアJSで実装（`atob` + 文字変換）
- `exp` クレームの有効期限状態（有効/期限切れ + 相対時間）を表示
- `iat` / `nbf` を人間が読める日時に変換して補足表示
- 各セクションにコピーボタン

**Route**: `app/jwt/`

---

### Number Base Converter

> 2進数・8進数・10進数・16進数を相互変換する。`BigInt` を使用。

- 4つの入力フィールドのどれを編集しても即時変換
- `BigInt` で大きな数値も精度を保って処理
- 不正入力のエラー表示

**Route**: `app/base/`

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

### Ratio Calculator

> 比率の簡略化と、比率と片方の値からもう片方を計算する。純粋なクライアントサイド計算。

- Simplify: a と b を入力 → GCD で割り算し最小整数比を表示（例: 1920:1080 → 16:9）
- Calculate: 比率と a か b の一方を入力 → もう一方をリアルタイム計算
- 小数の場合は切り上げ・切り下げも表示

**Route**: `app/ratio/`

---

### RegEx Tester

> 正規表現パターンとテスト文字列を入力し、マッチ箇所をリアルタイムでハイライト表示する。

- フラグ選択: `g` / `i` / `m` / `s` / `u`（トグルボタン）
- マッチ箇所を `<mark>` でインラインハイライト
- マッチ一覧: index / value / キャプチャグループ
- 無効な正規表現のエラー表示

**Route**: `app/regex/`

---

### UUID Generator

> v4 UUID をまとめて生成する。`crypto.randomUUID()` を使用。

- 生成数指定（1〜20件）
- UPPERCASE トグル
- 個別コピー + まとめてコピー（改行区切り）

**Route**: `app/uuid/`

---

### 2048

> Slide and merge tiles to reach 2048. A classic single-player puzzle game.

- Arrow keys / swipe to move tiles
- Same-value tiles merge on collision
- Score tracking with local best score persistence
- Win at 2048 with option to keep playing
- Touch / swipe support for mobile

**Route**: `app/2048/`

---

### Connect Four

> Drop discs to connect four in a row. Real-time 2-player game.

- 7x6 board with column-based disc dropping
- Win detection: 4 in a row (horizontal, vertical, diagonal)
- Game server: `games-api.0xjj.dev` (`workers/games/`)

**Route**: `app/connect-four/`
**API**: `POST /rooms?game=connect-four`, `GET /ws?game=connect-four&room=XXXXXX` (WebSocket)

---

### Dots & Boxes

> Draw lines to complete boxes and outscore your opponent. Real-time 2-player.

- 5x5 dot grid (4x4 boxes, 40 lines)
- Completing a box scores a point and grants an extra turn
- Game server: `games-api.0xjj.dev` (`workers/games/`)

**Route**: `app/dots-and-boxes/`
**API**: `POST /rooms?game=dots-and-boxes`, `GET /ws?game=dots-and-boxes&room=XXXXXX` (WebSocket)

---

### Reversi

> Classic disc-flipping strategy game. Real-time 2-player.

- 8x8 board with Black/White discs
- Valid move highlighting, automatic disc flipping
- Turn passes if no valid moves; game ends when neither can move
- Game server: `games-api.0xjj.dev` (`workers/games/`)

**Route**: `app/reversi/`
**API**: `POST /rooms?game=reversi`, `GET /ws?game=reversi&room=XXXXXX` (WebSocket)

---

### Tic-Tac-Toe

> Real-time 2-player Tic-Tac-Toe. Create a room, share the link, and play.

- Classic 3x3 board with X and O
- Game server: `games-api.0xjj.dev` (`workers/games/`)

**Route**: `app/tictactoe/`
**API**: `POST /rooms?game=tictactoe`, `GET /ws?game=tictactoe&room=XXXXXX` (WebSocket)

---

### Word Wolf

> Find the wolf hiding among your friends! A real-time party game for 3-8 players.

- Cloudflare Durable Objects + WebSocket + Alarm API
- Room → Name → Join → 3min Discussion → Vote → Result
- Wolf reversal guess chance when caught
- Game server: `games-api.0xjj.dev` (`workers/games/`)

**Route**: `app/wordwolf/`
**API**: `POST /rooms?game=wordwolf`, `GET /ws?game=wordwolf&room=XXXXXX` (WebSocket)

---

### Liquid Glass

> Apple-inspired Liquid Glass effect using SVG filters and backdrop-filter.

- SVG フィルター: feTurbulence + feDisplacementMap + feGaussianBlur + feSpecularLighting
- マウス追従するガラスパネル (lerp でスムーズ追従)
- パラメータ調整 UI: Blur / Distortion / Turbulence / Specular / Panel Size
- プリセット: Subtle / Default / Wavy / Crystal / Molten
- Chrome/Edge 推奨 (SVG filter + backdrop-filter の組み合わせ)

**Route**: `app/liquid-glass/`

---

### Tilt Card

> Interactive 3D tilt card with flip animation powered by Motion.

- マウス追従で 3D チルトエフェクト
- 端まで引っ張るとカードがフリップ
- クリックで Dialog を開いてインタラクション
- motion/react (useSpring, useTransform) でスプリングアニメーション

**Route**: `app/tilt-card/`

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
