---
title: "Web技術年末試験 2023"
topics: ["web", "css", "javascript", "cookie", "baseline"]
published: true
---

2023 年の web 技術の振り返りとして [Web 技術年末試験 2023](https://web-study.connpass.com/event/308040/) に参加した。

この記事は解法や試験の問題について詳しく解説することはせず、自分がどのように考えてどのツールを使って検索したかを記述しておく。

**試験のレギュレーション**

- 制限時間: 60 分
- 何を調べても良い(検索、AI など)
- Google Docs で行うため、Google アカウントが必要

試験自体の講評は主催者である Jxck さんが自身のブログにて書いているのでそちらを参照してください。

https://blog.jxck.io/entries/2024-01-23/web-exam-2023.html

# 結果

96 点。凡ミスが目立つ形になってしまった。

![](https://storage.googleapis.com/zenn-user-upload/458fa8de4d79-20240125.png)

# 戦略

まず自分の戦略は AI に出典付きで回答をもらって出典を確認して正誤を確かめる。知ってる内容や、みたことある内容の場合は仕様や web.dev などの記事を検索する形をとることにした。

ChatGPT4 は Bing での検索をかけた結果のサマリーを返してくれるため、昨今の情報も良い感じに集められるのは大変楽だった。ただし、ワードを知ってないといけないとか、それが正しいかどうかを判断する経験や知識が必要であるというのは変わりない。

:::message
これより下は試験の内容に触れます。まだ受験してなくて自分の点数を想定回答を元に計算しようとしている人は見ないでください。
:::

以下が自分の試験実施時のブラウザの履歴だが、これらのリンクをこの記事に貼ってこの試験の内容に合わせてのちの自分が再確認できるようにしておく。

![](https://github.com/konojunya/zenn/blob/main/assets/articles/web-exam-2023/browser-history.jpg?raw=true)

拡大してみたい方は[こちら](https://github.com/konojunya/zenn/blob/main/assets/articles/web-exam-2023/browser-history.jpg?raw=true)(2.3MB)

# 回答への辿り着き方（検索方法）

## 大問1

問 1 は [Baseline](https://developer.mozilla.org/ja/docs/Glossary/Baseline/Compatibility) に関する問題だった。

これはそもそも **Baseline** という言葉を知ってないと検索が難しい内容ではあった気がするが、逆に「ブラウザ間の互換性の問題」や「[Interop](https://web.dev/blog/interop-2023)」などのワードに対してアンテナを貼っている人たちであれば以下のニュースは記憶に新しいだろう。

https://www.publickey1.jp/blog/23/webbaselinewebwebmdn.html

Baseline 周りで検索していたページは以下。

https://developer.mozilla.org/ja/docs/Glossary/Baseline/Compatibility

https://www.w3.org/community/webdx/

https://web.dev/baseline?hl=ja

最後の web.dev の記事の中に。

> ベースラインには次の 2 つのステージがあります。
> 新たに利用可能になった機能: この機能は最新のコアブラウザでサポートされるため、相互運用性を確保できます。
> 広く使用可能: 新しい相互運用可能な日から 30 か月が経過しました。サポートを気にすることなく、ほとんどのサイトでこの機能を使用できます。

とある。日本語だと回答として微妙な気がしたので英語のページに切り替えて**Newly available**, **Widely available** あたりのワードを拾うことができる。

ワードさえ出てきてしまえばあとは ChatGPT に一旦聞いてみれば良い。

**WebDX Community Group** について。

![](https://storage.googleapis.com/zenn-user-upload/d4af0e95a23d-20240125.png)

30 ヶ月で Widely available になるというのは web.dev に記載の通りなのだが、問題では何%のユーザーに到達するのかを問われているので、そのまま聞いてみる。

![](https://storage.googleapis.com/zenn-user-upload/12fff33750a5-20240125.png)

結果出典として以下の web.dev の記事を用いてることがわかる。大問 1 に関してはこの記事に辿り着くとほぼ答えになる。

https://web.dev/blog/baseline-definition-update?hl=ja

## 大問2

**3rd Party Cookie Deprecation** の話だが、Chrome のフラグは「3rd Party Cookie Deprecation chrome flag」みたいに検索すれば大体当たりの記事にヒットする。

https://developers.google.com/privacy-sandbox/blog/cookie-countdown-2023oct?hl=ja

延長に関しても上記記事の中の「[広告以外のユースケースについては、サードパーティの非推奨トライアルの延長をリクエストする](https://developers.google.com/privacy-sandbox/blog/cookie-countdown-2023oct?hl=ja#request_additional_time_with_the_third-party_deprecation_trial_for_non-advertising_use_cases)」がそれに該当する。

そうすると **オリジントライアル** に辿り着くが、詳しい内容は以下のページにまとまっている。

https://developer.chrome.com/docs/web-platform/origin-trials/?hl=ja#deprecation-trials

その中には **非推奨トライアル** と書かれた項目があり、以下のように説明されている。

> すべてのオリジン トライアルが新しい API のテストを目的としたわけではありません。トライアルでは、非推奨の機能を一時的に再度有効にできます。これは非推奨トライアルと呼ばれ、文脈によっては、「リバース オリジン トライアル」と呼ばれることもあります。

ということで、ここから 3rd party cookie のものを探せば良くなるが、上記記事の中で「有効なトライアルのリスト」と書いてあるリンクの先は 404 になっている。

これは日本語で記事を読んでいる際に、Chrome for Developers からの遷移時 `#hl=ja` のつける場所が原因なので `#hl=ja` を抜いてリロードすれば正しいページが閲覧できる。

https://developer.chrome.com/origintrials/#/trials/active

以下が 3rd party cookie の延長に関するオリジントライアル。

> This is a general purpose deprecation trial that will allow a third-party embed to opt into temporarily continue using third-party cookies. This will give sites more time to migrate to solutions that don't require third party cookies and minimize site breakage/compatibility issues during third party cookie deprecation

https://developer.chrome.com/origintrials/#/view_trial/3315212275698106369

問 3 は正直難しかったが、**Privacy Sandbox** と調べて有益そうなサイトを閲覧してると大体ユースケースと一緒に羅列してくれている。参考になったのは以下の 2 つのサイト。

https://developers.google.com/privacy-sandbox/overview?hl=ja

https://privacysandbox.com/intl/ja_jp/open-web/

問 4 は iframe の問題であるというところからおおよそ **Storage Access API** と **Cookies Having Independent Partitioned State(CHIPS)** あたりであろうという当てをつけて一旦検索しまくる。しかし記述問題で Storage Access API と CHIPS は名前と内容をざっくり知っているだけだったため、時間がかかりそうだと判断し、回答を書くのは一番最後にした。

https://developers.google.com/privacy-sandbox/3pcd/chips?hl=ja

https://developer.mozilla.org/en-US/docs/Web/Privacy/Partitioned_cookies

https://developer.mozilla.org/ja/docs/Web/API/Storage_Access_API

https://blog.jxck.io/entries/2023-12-14/partitioning.html

3rd party cookie は前職で ITP の制限が厳しくなってきた時点で結構触ったり、ちょうど今月から Chrome のユーザー 1% に対して deprecate が施行されるということで話題にあがったりしてたため、復習した事でワードが頭に入っていたのがよかった。Privacy Sandbox むずすぎる。

直近で一緒に 2 時間ほど 3rd party cookie について議論してくれた[元同僚](https://twitter.com/__yoshi_dev)に感謝。

## 大問3

CSS の問 1 は超基礎の詳細度の話なので、割愛。直接の小要素を指す形はなんだったかを思い出せればそのまま書くだけ。

https://developer.mozilla.org/ja/docs/Web/CSS/Child_combinator

問 2 は **@scope** を使えと書いてるので `@scope` について検索して使い方見ながら描き直すだけ。コリスさんの記事は毎回丁寧でかなり噛み砕いてくれているので大変理解しやすい。

https://coliss.com/articles/build-websites/operation/css/about-css-scope.html

https://developer.mozilla.org/ja/docs/Web/CSS/:scope

問 3 は **Subgrid** を使えと書いているのでまずは検索する。

https://developer.mozilla.org/ja/docs/Web/CSS/CSS_grid_layout/Subgrid

https://developer.mozilla.org/ja/docs/Web/CSS/grid-row

今回の問題は縦に 3 つの要素を配置しているコンポーネントの subgrid なので `grid-template-rows: subgrid` としながら `grid-row: span 3;` を指定するだけ。ただし、問 2 の記述を持ってきて 2 行追加せよとあるので、問 2 の scope が答えられないと同じく難しい。

また `grid-row: span 3;` の `span` に関しては `grid-row` の使い方を知ってないと少し難しい。

> グリッドアイテムのグリッド領域の列側の先頭の端が末尾の端から n 行になるように、グリッドアイテムの配置にグリッドスパンを設定します。

https://developer.mozilla.org/ja/docs/Web/CSS/grid-row#span_integer_custom-ident_

## 大問4

Abort 周りの話になる。ここは試験を受ける前日に Gecko の Intent to prototype and ship として **AbortSignal.any** が通知されていたので再度読んでおこうと Jxck さんの記事を見てたので楽勝に回答できた。

https://groups.google.com/a/mozilla.org/g/dev-platform/c/p84BwYsBdOg/m/Wfk7zUUNAQAJ?pli=1

![](https://storage.googleapis.com/zenn-user-upload/21720535dc2c-20240125.png)

大問 4 の回答はほぼ全て Jxck さんのブログで説明がされている。

https://blog.jxck.io/entries/2023-06-01/abort-signal-any.html

コード自体も前日に PR を送ってたので、そのまま書くだけだった。

https://github.com/Jxck/jxck.io/pull/90

# Outro

今回の試験を通じて、特に Privacy Sandbox への理解と Cookie 周りへの理解が深まったと思える。ただまだまだ人にうまく説明できるほど理解しきれてない API も多数あるので特に深く勉強しないといけないと思った領域でもあった。

CSS はかなり便利になりつつあり、少し前まで Nesting させたいというモチベーションだけで SCSS を書いていたり、 grid は IE がね〜みたいなことを言ってたがもう世の中の新規のプロダクトはほぼ、既存のプロダクトでも IE のサポートを切って新しい記法や CSS を使えるようにしたいという動きを感じるので便利になったなと感じている。

多くの情報はやはり新卒でお世話になった会社の先輩方から学んだものが多いので、今でもとても感謝し尊敬している。

**おまけ**

IFTTT などを使って [Intent to Ship の X アカウント](https://twitter.com/intenttoship) を slack へ流したり、X でフォローしておいて通知を入れておくとかなり俊敏に今どのブラウザで何が行われているのかをウォッチできて、知らないものをその場で検索したり同僚との話題にできたりするのでオススメしています。

半分ぐらい真面目なポストをしてるのでワタクシもぜひ（？）

https://twitter.com/konojunya
