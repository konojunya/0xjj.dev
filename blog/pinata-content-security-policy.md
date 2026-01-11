---
title: "NFTのコンテンツサーバーにPinataを使う場合の注意点"
topics: ["pinata", "nft"]
published: true
---

NFT を作成する際にその中でも、 JavaScript でアニメーションを描いたりしてインタラクティブなものを作成することがあります。今回はそのような事例の際に気をつけないといけない点を紹介します。

# Pinata とは

[Pinata](https://www.pinata.cloud/) とは、IPFS ピンニングサービスの１つです。ここに静的なファイルをアップロードが行えて、コンテンツの管理自体は IPFS が担ってくれているので Web3 界隈ではよく使われるイメージがあります。

# 注意すべき点とは

先に結論を述べてしまうと、 Pinata のコンテンツには以下のようなレスポンスヘッダーが付与されます。

```
access-control-allow-headers: Content-Type
access-control-allow-headers: Range
access-control-allow-headers: User-Agent
access-control-allow-headers: X-Requested-With
access-control-allow-methods: GET
access-control-allow-methods: HEAD
access-control-allow-origin: *
access-control-expose-headers: Content-Length
access-control-expose-headers: Content-Range
access-control-expose-headers: X-Chunked-Output
access-control-expose-headers: X-Ipfs-Path
access-control-expose-headers: X-Ipfs-Roots
access-control-expose-headers: X-Stream-Output
age: 891
cache-control: public, max-age=29030400
cf-cache-status: HIT
cf-ray: 75c0e8f3aa93e08a-NRT
content-encoding: gzip
content-security-policy: default-src 'self'; img-src * data: blob: 'unsafe-inline'; style-src * 'unsafe-inline';
content-type: text/html
date: Tue, 18 Oct 2022 11:24:51 GMT
expires: Tue, 19 Sep 2023 11:24:51 GMT
last-modified: Tue, 18 Oct 2022 11:10:00 GMT
server: cloudflare
vary: Accept-Encoding
x-ipfs-path: /ipfs/<ipfs hash>
x-ipfs-roots: <ipfs hash>
```

今回、このレスポンスヘッダーのうち特に注意しないといけない点は `content-security-policy` です。

## Content Security Policy とは？

では今回注意すべきと言った、 Content Security Policy とはなんでしょうか。

ref: https://developer.mozilla.org/ja/docs/Web/HTTP/CSP

> コンテンツセキュリティポリシー (CSP) は、クロスサイトスクリプティング (Cross-site_scripting) やデータインジェクション攻撃などのような、特定の種類の攻撃を検知し、影響を軽減するために追加できるセキュリティレイヤーです。

とあります。つまりこの設定をすることで XSS などの外部からの攻撃を検知し、ブラウザがそのリクエストをエラーにしてしまうことで、影響を軽減するため追加するものになります。

今回のレスポンスヘッダーに関してはこちらでより詳細にヘッダーの説明がされています。

ref: https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Content-Security-Policy

## デモ

実際にデモ NFT のコンテンツを用意しましょう。とても単純なものでよいので以下のような実装にします。

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>p5.js example</title>
    <script src="https://cdn.jsdelivr.net/npm/p5@1.4.2/lib/p5.js"></script>
    <script>
      function setup() {
        createCanvas(400, 400);
      }

      function draw() {
        background(220);
        ellipse(50, 50, 80, 80);
      }
    </script>
  </head>
  <body></body>
</html>
```

この HTML をブラウザで確認すると以下のような表示になります。

![](https://storage.googleapis.com/zenn-user-upload/cb825f4c6b10-20221018.png)

ではこの HTML を Pinata を使ってアップロードしてみましょう。

アップロードされた HTML を確認しても画面上には何も表示されていません。

エラーは以下です。

![](https://storage.googleapis.com/zenn-user-upload/f33be9560cf8-20221019.png)

> Refused to load the script 'https://cdn.jsdelivr.net/npm/p5@1.4.2/lib/p5.js' because it violates the following Content Security Policy directive: "default-src 'self'". Note that 'script-src-elem' was not explicitly set, so 'default-src' is used as a fallback.

> Refused to execute inline script because it violates the following Content Security Policy directive: "default-src 'self'". Either the 'unsafe-inline' keyword, a hash ('sha256-fF3DaD9HR6DliS3PyAkXbc3Y/ozLAkbDdKOJlppl5Rg='), or a nonce ('nonce-...') is required to enable inline execution. Note also that 'script-src' was not explicitly set, so 'default-src' is used as a fallback.

## 解決方法

エラーが 2 つあります。1 つ目は外部スクリプトを読み込んでいますが `default-src` で `self` を指しているため取得できず、エラーになっています。2 つ目は自分自身の書いた JavaScript が実行できなかったというエラーです。

解決方法としては、どちらも HTML を配信しているドメインと同じドメインで配信し、 inline script にならないようファイルを分けて配信します。

先ほどの実装に少し手を加えてみます。

まずは p5.js を手元にダウンロードします。そして inline で書いていた script を別のファイルに書き出しましょう。つまりファイル構成は以下のようになります。

```
- index.html
- p5.js
- script.js
```

そして HTML を以下のように変更します。

```diff
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>p5.js example</title>
-    <script src="https://cdn.jsdelivr.net/npm/p5@1.4.2/lib/p5.js"></script>
+    <script src="p5.js"></script>
-    <script>
-      function setup() {
-        createCanvas(400, 400);
-      }
-
-      function draw() {
-        background(220);
-        ellipse(50, 50, 80, 80);
-      }
-    </script>
+    <script src="script.js"></script>
  </head>
  <body></body>
</html>
```

この 3 つのファイルをそのまま folder として pinata にアップロードします。

すると以下のように pinata でも JavaScript を動作させることができました！

![](https://storage.googleapis.com/zenn-user-upload/9efe5e866a76-20221019.png)

# あとがき

今回扱った example は[こちら](https://github.com/konojunya/zenn/tree/main/examples/pinata-csp)です。
