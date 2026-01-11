---
title: "sourcemap と next-pwa"
topics: ['serviceworker', 'pwa', 'nextjs', 'sourcemap']
published: true
---

sourcemap を作ってる場合に [next-pwa](https://github.com/shadowwalker/next-pwa) をそのまま使うとエラーになるのでその原因と対処法を記事にします。

# 原因

通常、実務環境ではエラーのレポートのために Sentry などのサービスを導入しますが、その際に Sentry のレポート上で JavaScript のどの部分でエラーになったのかをわかりやすく見るために、sourcemap を作成します。これは両者のオピニオンがありますが、その sourcemap を production 環境にも一緒にデプロイするかは組織によって違う気がします。

僕は sourcemap を置かない派の人間なので、sourcemap を作ってビルドを行い Sentry であれば cli 経由でアップロードを行い、CI 上で削除します。この状態で next-pwa を使うと以下のようなエラーが発生します。

![](https://storage.googleapis.com/zenn-user-upload/72ec45f5c27e-20220105.png)

> Uncaught (in promise) bad-precaching-response: bad-precaching-response :: [{"url": "http://example.com/_next/static/chunks/hash.js.map", "status":404}]

これはビルド時には `_next/static/chunks/hash.js` に対する sourcemap の `_next/static/chunks/hash.js.map` が存在してたので precache の対象に入っているためです。

では、`public/` の配下に吐かれる `sw.js` の中身を確認します。吐き出される `sw.js` は圧縮されてるので Prettier などで整形してください。確認すると下記のように `url: '_next/static/chunks/hash.js.map'` が `precacheAndRoute` に設定されています。

![](https://storage.googleapis.com/zenn-user-upload/b955dd4a3f3f-20220105.png)

## precacheAndRoute とは

precacheAndRoute はどういう挙動をするものなのでしょうか。

> Calling precacheAndRoute() or addRoute() will create a route that matches requests for precached URLs.
> The response strategy used in this route is cache-first: the precached response will be used, unless that cached response is not present (due to some unexpected error), in which case a network response will be used instead.
> The order in which you call precacheAndRoute() or addRoute() is important. You would normally want to call it early on in your service worker file, before registering any additional routes with registerRoute(). If you did call registerRoute() first, and that route matched an incoming request, whatever strategy you defined in that additional route will be used to respond, instead of the cache-first strategy used by workbox-precaching.

ref: https://developers.google.com/web/tools/workbox/modules/workbox-precaching

ざっくり要約すると、 precacheAndRoute に設定されたものは *キャッシュファースト* として応答されます。キャッシュされたものが存在しない場合は、ネットワークにアクセスしてリソースを取得します。

precacheAndRoute に指定されたものは特定のキーと共にキャッシュストレージに保存されます。

![](https://storage.googleapis.com/zenn-user-upload/cb8d1692294d-20220105.png)

ここに保存するファイルを確認できなかったため上記のようなエラーになりました。


# 解決法

エラーになると ServiceWorker を Activate 出来ません。そうするとキャッシュが出来ないため、せっかく next-pwa を導入したのに使えない状態になってしまいます。

解決法はとても簡単で next-pwa の README にも書いています（小さくて若干わかりにくいです）。

> buildExcludes - an array of extra pattern or function to exclude files from being precached in .next/static (or your custom build) folder
> default: []
> example: [/chunks\/images\/.*$/] - Don't precache files under .next/static/chunks/images (Highly recommend this to work with next-optimized-images plugin)
> doc: Array of (string, RegExp, or function()). One or more specifiers used to exclude assets from the precache manifest. This is interpreted following the same rules as Webpack's standard exclude option.

[shadowwalker/next-pwa#buildExcludes](https://github.com/shadowwalker/next-pwa#:~:text=buildExcludes)

`buildExcludes` を設定すればいいので今回の場合は `.js.map` を exclude すれば良いでしょう。以下のように `next.config.js` を書き換えます。

```js
const withPWA = require('next-pwa')

module.exports = withPWA({
  buildExcludes: [/.*\.js\.map/],
});
```

設定をした状態でもう一度ビルドして `public/sw.js` を確認します。

![](https://storage.googleapis.com/zenn-user-upload/7b2c487c681c-20220105.png)

うまく sourcemap を exclude できました。この状態だと ServiceWorker の Activate も問題なくできます。

![](https://storage.googleapis.com/zenn-user-upload/c0d5a4847bfd-20220105.png)

network タブを確認してみると ServiceWorker からコンテンツが返ってきているのも確認できます。

![](https://storage.googleapis.com/zenn-user-upload/1d97659ef14b-20220106.png)
