---
title: "@opennextjs/cloudflare から vinext に移行した"
date: 2026-02-28
---

playground.0xjj.dev を `@opennextjs/cloudflare` から [vinext](https://vinext.io/) に移行しました。vinext は Next.js の App Router を Vite 上で再実装したフレームワークで、`@cloudflare/vite-plugin` と組み合わせることで Cloudflare Workers へのデプロイがシンプルになります。

`@opennextjs/cloudflare` は Next.js のビルド成果物を Workers 向けに変換するアダプタですが、vinext は Vite ベースでビルドパイプライン全体を制御するため、Vite プラグインのエコシステムをそのまま使えるのが大きな利点です。

今回の移行は [Claude Code](https://docs.anthropic.com/en/docs/claude-code) を使って行いました。vinext 公式が提供している agent skill があり、以下のコマンドでインストールできます。

```sh
npx skills add cloudflare/vinext
```

この skill をインストールした状態で Claude Code に移行を指示すると、互換性チェックから `package.json` の書き換え、`vite.config.ts` の生成、`wrangler.jsonc` の更新まで一通り自動で行ってくれます。以降の記事ではその過程で発生したハマりポイントを中心に記録していきます。

## 移行前の構成

移行前は Next.js 16 + `@opennextjs/cloudflare` の構成でした。

```json:package.json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "build:opennext": "opennextjs-cloudflare build",
    "preview": "opennextjs-cloudflare preview",
    "deploy": "opennextjs-cloudflare deploy"
  }
}
```

ビルドは `next build` → `opennextjs-cloudflare build` の 2 段階で、`open-next.config.ts` も必要でした。

## vinext check で互換性チェック

vinext には `vinext check` というコマンドがあり、既存の Next.js プロジェクトの互換性をチェックできます。実行すると 91% compatible という結果が出ました。唯一の issue は `package.json` に `"type": "module"` が設定されていないことだけでした。

## package.json の変更

deps の入れ替えと scripts の変更を行います。

```diff:package.json
+  "type": "module",
   "scripts": {
-    "dev": "next dev --turbopack",
-    "build": "next build",
-    "build:opennext": "opennextjs-cloudflare build",
-    "preview": "opennextjs-cloudflare preview",
-    "deploy": "opennextjs-cloudflare deploy",
+    "dev": "vinext dev",
+    "build": "vinext build",
+    "preview": "vinext start",
+    "deploy": "vinext deploy",
   }
```

依存パッケージも入れ替えます。

```diff:package.json
-    "@mdx-js/loader": "^3.1.1",
-    "@next/mdx": "^16",
+    "@mdx-js/rollup": "^3.1.1",
-    "next": "^16",
```

```diff:package.json
+    "@cloudflare/vite-plugin": "^1",
-    "@opennextjs/cloudflare": "^1.0.0",
+    "@vitejs/plugin-rsc": "^0",
+    "vinext": "^0",
+    "vite": "^7",
```

`next` と `@opennextjs/cloudflare` を削除し、代わりに `vinext` / `vite` / `@cloudflare/vite-plugin` を追加します。MDX も `@next/mdx` + `@mdx-js/loader` から Vite プラグインの `@mdx-js/rollup` に変更しています。

## vite.config.ts の作成

vinext の設定は `vite.config.ts` に書きます。

```ts:vite.config.ts
import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import mdx from "@mdx-js/rollup";
import remarkGfm from "remark-gfm";
import rehypePrettyCode from "rehype-pretty-code";

export default defineConfig({
  plugins: [
    {
      enforce: "pre",
      ...mdx({
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          [
            rehypePrettyCode,
            {
              theme: { dark: "github-dark", light: "github-light" },
              keepBackground: false,
            },
          ],
        ],
      }),
    },
    vinext(),
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
    }),
  ],
});
```

ここで 2 つハマりポイントがありました。

### `@vitejs/plugin-rsc` の duplicate エラー

最初 `@vitejs/plugin-rsc` を plugins に明示的に追加していたところ、以下のエラーが出ました。

```
Error: Duplicate plugin "vite:rsc"
```

vinext が内部で `@vitejs/plugin-rsc` を自動的に登録するため、自分で追加する必要はありません。`devDependencies` には残しますが、`vite.config.ts` の plugins からは外します。

### MDX プラグインに `enforce: "pre"` が必要

MDX プラグインを `enforce` なしで登録すると、以下のエラーが出ます。

```
Parse error @:1:1
```

これは `es-module-lexer` によるパースエラーで、RSC の scan-strip プラグインが MDX ファイルを先に処理しようとして失敗しています。`enforce: "pre"` を指定して MDX の変換を RSC scan-strip より先に実行させることで解決します。

## wrangler.jsonc の更新

`main` のエントリーポイントと `assets` の設定を変更します。

```diff:wrangler.jsonc
-  "main": ".open-next/worker.js",
+  "main": "vinext/server/app-router-entry",
   "assets": {
-    "directory": ".open-next/assets",
-    "binding": "ASSETS"
+    "not_found_handling": "none"
   },
```

`@opennextjs/cloudflare` では `.open-next/` 配下のビルド成果物を参照していましたが、vinext では `vinext/server/app-router-entry` をエントリーポイントとして指定します。assets のディレクトリ指定も不要になります。

## Cloudflare Workers 固有の問題

移行後、Cloudflare Workers 上で 2 つの問題が発生しました。

### `getCloudflareContext()` → `import { env } from 'cloudflare:workers'`

`@opennextjs/cloudflare` では `getCloudflareContext()` を使って環境変数や service binding にアクセスしていました。

```ts
// before
import { getCloudflareContext } from '@opennextjs/cloudflare';

const { env } = getCloudflareContext();
```

vinext ではこの API は存在しないため、`cloudflare:workers` から直接 `env` を import します。

```ts
// after
import { env } from 'cloudflare:workers';
```

### `request.nextUrl` → `new URL(request.url)`

`@opennextjs/cloudflare` は `NextRequest` の `nextUrl` プロパティを shim していましたが、vinext にはこの shim がありません。

```ts
// before
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('url');
}
```

標準の `URL` API を使うように書き換えます。型も `NextRequest` から `Request` に変更します。

```ts
// after
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('url');
}
```

## まとめ

`@opennextjs/cloudflare` から vinext への移行は、互換性チェックの結果通りスムーズに進みました。ビルドが 2 段階から 1 段階になり、`open-next.config.ts` も不要になったことで構成がシンプルになっています。Vite プラグインのエコシステムをそのまま使えるのも大きなメリットです。

Claude Code の vinext skill を使えば定型的な書き換えは自動化できるので、Cloudflare Workers 上で Next.js を動かしている方は試してみてください。
