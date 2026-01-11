---
title: "Next.jsにおけるenvのベストプラクティス"
topics: ["nextjs", "環境変数"]
published: true
---

Next.js で env をうまく扱うために僕がよく使う手法を紹介します。

# Next.js がサポートしている env の扱い

Next.js はデフォルトで大きく 2 つの方法で env をサポートしています。

1. .env ファイルの読み込み
2. next.config.js の env キーに記述する

## .env ファイルの読み込み

Next.js は .env ファイルを配置することで `process.env` に読み込む機能をデフォルトでサポートしています。なのでプロジェクトのルートに、以下のようなファイルを配置してください。

```env:.env
API_ORIGIN=http://localhost:8080
```

Next.js のプロジェクトでは `process.env.DB_HOST` で読み込むことができます。

ref: https://nextjs.org/docs/basic-features/environment-variables

## next.config.js の env キーの記述する

Next.js の設定ファイルである `next.config.js` には `env` というキーが存在します。

```js:next.config.js
module.exports = {
  env: {
    customKey: 'my-value',
  },
}
```

ref: https://nextjs.org/docs/api-reference/next.config.js/environment-variables

# NODE_ENV の存在

環境変数を扱うために、よくあるのは `NODE_ENV` に `development` や `production` などの環境を指す文字列を挿入し、 `process.env.NODE_ENV` により実装を分岐させるということをよくやります。

いろんなソースコードでこの使い方はされており、 Next.js もまた `NODE_ENV` を扱っている実装があります。

```ts:next.ts
const defaultEnv = command === 'dev' ? 'development' : 'production'

const standardEnv = ['production', 'development', 'test']

if (process.env.NODE_ENV && !standardEnv.includes(process.env.NODE_ENV)) {
  log.warn(NON_STANDARD_NODE_ENV)
}

;(process.env as any).NODE_ENV = process.env.NODE_ENV || defaultEnv
```

ref: https://github.com/vercel/next.js/blob/7e370134fb46dede3809df664db95c603a5a2997/packages/next/bin/next.ts#L87-L95

上記の実装でもあるように、 Next.js は以下の `NODE_ENV` しかサポートしていません。

- production
- development
- test

ただし、現場で Next.js を使っていると「staging 環境では staging.api.example.com が API のオリジンになる」とかがあり、Next.js がサポートしていない `NODE_ENV` を使いたい需要はあります。

こう言った場合に使える方法として `APP_ENV` などのように別の環境変数を作成する方法です。

# APP_ENV を使った Next.js プロジェクトの構成

APP_ENV を使うと NODE_ENV ではサポート出来なかった `staging` などの設定をうまく書き分けることができます。そこで使うのは next.config.js の env キーによる環境変数の読み込みです。

`next.config.js` を以下のように設定します。

```js:next.config.js
module.exports = {
  env: {
    ...require(`./config/${process.env.APP_ENV || 'local'}.json`),
  },
}
```

プロジェクトのルートに `config` というディレクトリを作成し、以下のようにファイルを作成します。

```json:config/local.json
{
  "API_ORIGIN": "http://localhost:8080"
}
```

このプロジェクトを `yarn dev` などで起動すると `next.config.js` を読み込んだ際に `require` をするためその先のファイルを読みに行きます。 `NODE_ENV` は `development` になり、 `APP_ENV` は設定してないので `local` になるので `config/local.json` を読み込みます。 JSON ファイルを読み込んだらスプレッド演算子により最終的に `next.config.js` の env は以下のようになります。

```js
module.exports = {
  env: {
    API_ORIGIN: "http://localhost:8080",
  },
}
```

この方法であればどんな環境に対してでも対応ができます。

`config/staging.json` を作成して以下のようなファイルを作成します。

```json:config/staging.json
{
  "API_ORIGIN": "https://staging.api.example.com"
}
```

`APP_ENV=staging yarn dev` として起動する、または Docker などの環境に対して `APP_ENV=staging` と設定してから `yarn start` を行えば、 `API_ORIGIN` は `https://staging.api.example.com` になっています。
