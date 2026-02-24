---
title: "Figma plugin with WebAssembly"
date: 2020-10-26
---

Figma の Plugin を Rust を使って書いて WebAssembly にコンパイルしたものを Figma 上で使ってみるサンプルを作ってみます。

# Figma Plugin のテンプレートから作る

まずは Figma の Plugin のテンプレートから **With UI & browser APIs** を選択して作っていきます。他の 2 つのテンプレートはそれぞれ、 Plugin の作成の必須ファイルである `manifest.json` とメインの JavaScript ファイルだけを作るものと、 UI が必要ないような Plugin を作るためのものとなっています。

**Profile の Plugin の画面へいく**

![](https://storage.googleapis.com/zenn-user-upload/ld3z9g2v9o2ucmwbpfp5knxo00ge)

**`Create your own plugin` の横の追加ボタンをクリック**

![](https://storage.googleapis.com/zenn-user-upload/ilwwsvea1j84ejs9yfk1x4e4gt2s)

**`With UI & browser APIs` を選択する**

![](https://storage.googleapis.com/zenn-user-upload/3vym1hq79qldbd4sdjfhc5u9q3a6)

**中身を確認する**

![](https://storage.googleapis.com/zenn-user-upload/mzxo0iuj2yugib7ijbwey7gisws6)

今回作る Plugin は選択された色の補色を横に並べるだけの簡単なものを作ってみましょう。

# 補色の求め方

そもそも補色をどのようにして求めるのかですが、求め方は以下の手順に沿って決めることとします。

1. 選択された色の RGB の中から最小値と最大値を求める。
2. 求められた最小値と最大値の和を求める。
3. 各 RGB の値を求められた和から引く

例を出すと `rgb(100, 150, 200)` という色があった場合、最小値と最大値はそれぞれ `100` と `200` になります。その和は `300` となります。
そのため補色は `rgb(300-100, 300-150, 300-200)` なので `rgb(200, 150, 100)` となります。

# Rust のプロジェクトを作る

先ほど Figma の Plugin を作るのに指定したディレクトリまで移動して Rust のプロジェクトを作ります。

cargo のバージョンは `cargo 1.47.0` です。

```shell
$ cargo init
```

# Rust の実装に落としてみる

今回の例は本当に簡単すぎて WebAssembly にする利点は Rust が書けるぐらいしかないのですが、例なのでご勘弁を。

では簡単に以下のような関数で求められるようにしましょう。

```rust:src/lib.rs
pub fn get_complementary_color(red: u16, green: u16, blue: u16) -> Vec<u16> {
    let rgb = [red, green, blue];
    let min = rgb.iter().min().unwrap();
    let max = rgb.iter().max().unwrap();
    let total = min + max;

    vec![total - red, total - green, total - blue]
}
```

```rust:src/main.rs
mod lib;

fn main() {
    let rgb = lib::get_complementary_color(100, 150, 200);
    println!("{:?}", rgb);
}
```

ここまで書いたら一度動かしてみましょう。

![](https://storage.googleapis.com/zenn-user-upload/8yzs2hzchsgzecakjkg0u860u2im)

:::message
本来 rgb の値は 0 ~ 255 なため `u8` で足りるのですが足算をする際に、イテレータから取り出した値を参照外しをしてアップキャストするなど、コードが複雑になるため `u16` を引数でとるようにしています。
:::

# Rust から WebAssembly にコンパイルする

Rust のコードが書けたので WebAssembly にコンパイルしていきます。使うツールとしては [wasm-pack](https://github.com/rustwasm/wasm-pack) というツールを使っていきます。そのためまずは Cargo を使ってインストールしていきます。

```bash
$ cargo install wasm-pack
```

その後、 `Cargo.toml` を編集し 2 点ほど書き加えます。これは Rust にパッケージの cdylib バージョンをビルドするように伝える記述と、WebAssembly と JavaScript の間のデータの受け渡しをラップしてくれるライブラリの追加です。

```toml:Cargo.toml
[package]
name = "figma_complementary_color_plugin"
version = "0.1.0"
...

[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2.68"
```

書いた後、一度ビルドしておきます。ビルドをするタイミングで初めてローカルにないライブラリを [https://crates.io](https://crates.io/) という Rust の package registry からダウンロードしてくれます。ダウンロードが済めば、エディタなどで補完が効きます。

![](https://storage.googleapis.com/zenn-user-upload/6hkqqzelghigbblzl2fpcmcqtn26)

```bash
$ cargo build
```

では、Rust のコードを WebAssembly へコンパイルしていきます。まずは `wasm_bindgen` というクレートを定義して、 `wasm_bindgen::prelude::*` を `use` というキーワードで宣言します。こうすることで `#[wasm_bindgen]` などのマクロを使えるようになります。

```rust:src/lib.rs
extern crate wasm_bindgen;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn get_complementary_color(red: u16, green: u16, blue: u16) -> Vec<u16> {
    let rgb = [red, green, blue];
    let min = rgb.iter().min().unwrap();
    let max = rgb.iter().max().unwrap();
    let total = min + max;

    vec![total - red, total - green, total - blue]
}
```

ここまで書けたらビルドしましょう。

```bash
$ wasm-pack build --target web
```

ビルドが完了すると `pkg` というディレクトリが作られています。

![](https://storage.googleapis.com/zenn-user-upload/1mosij7jwv3lda5hyeo6lt684liw)

またビルドをした際にエラーが表示されている場合、これは `wasm-opt` という最適化ツールの実行に失敗しているためです。

![](https://storage.googleapis.com/zenn-user-upload/ssewo40j8byfikl1r7z764ll3lif)

一旦最適化を off にしたいので `Cargo.toml` を編集していきます。

```toml:Cargo.toml
[package]
name = "figma_complementary_color_plugin"
version = "0.1.0"
...

[dependencies]
wasm-bindgen = "0.2.68"

[package.metadata.wasm-pack.profile.release]
wasm-opt = false
```

# JavaScript 側の処理を書く

WebAssembly のコンパイルが出来たので使う側のコードを書いていきます。その前にいくつかの package を install しましょう。

```bash
$ yarn add -D @figma/plugin-typings typescript prettier
```

`@figma/plgin-typings` は JavaScript 側の処理を書くにあたり TypeScript で書いていくのでその型情報になります。

ではメインの JavaScript の処理から書いていきます。すでにサンプル実装が書き込まれていますが、全て消して書き直していきます。

```ts:code.ts
figma.showUI(__html__);

const selection = figma.currentPage.selection[0];

type HasFillNode =
  | ComponentNode
  | InstanceNode
  | VectorNode
  | StarNode
  | LineNode
  | EllipseNode
  | PolygonNode
  | RectangleNode
  | TextNode;

type Color = {
  r: number;
  g: number;
  b: number;
};

type PostMessagePayload = {
  select: Color;
};

function hasFillsProperty(selection: SceneNode) {
  switch (selection.type) {
    case "COMPONENT":
    case "ELLIPSE":
    case "INSTANCE":
    case "LINE":
    case "POLYGON":
    case "RECTANGLE":
    case "STAR":
    case "TEXT":
    case "VECTOR":
      return true;
    default:
      return false;
  }
}

function sendToMessage(payload: PostMessagePayload) {
  figma.ui.postMessage(payload, { origin: "*" });
}

if (hasFillsProperty(selection)) {
  const paint = (selection as HasFillNode).fills[0] as Paint;

  if (paint.type === "SOLID") {
    sendToMessage({
      select: {
        r: Math.round(paint.color.r * 255),
        g: Math.round(paint.color.g * 255),
        b: Math.round(paint.color.b * 255),
      },
    });
  }
}
```

まず最初の `figma.showUI(__html__)` は Figma 上にプラグインの UI を表示するための関数です。 `code.ts` はプラグインを実行した際に呼ばれるため、そのタイミングで UI を表示してあげます。

次の `figma.currentPage.selection` ですが、 Figma 上で選択しているものになります。マウスを使って複数選択できるので配列になっていますが、今回は簡略化のため最初の 1 つを取るようにし `hasFillsProperty` で `fills` プロパティをもっている物だけ対象にしたいため実装しています。またアルファ値についても簡略化したいので、 `paint.type === 'SOLLID'` のものだけとしています。

この選択された色の情報は、 `figma.ui.postMessage` で UI 側の iframe へと postMessage を通じて通信します。

# UI を作る

iframe の中で動作する HTML を作っていきます。

```html:ui.html
<style>
  body {
    display: flex;
    justify-content: space-around;
    align-items: center;
  }
  .box {
    width: 100px;
    height: 100px;
  }
  .text {
    font-size: 0.75rem;
  }
</style>

<div>
  <p class="text">選択色</p>
  <div id="select" class="box"></div>
  <p id="select-rgb" class="text"></p>
</div>
<div>
  <p class="text">補色</p>
  <div id="complementary" class="box"></div>
  <p id="complementary-rgb" class="text"></p>
</div>

<script>
// ここに JavaScript の処理を書く
</script>
```

マークアップとスタイルは単純に横並びにしただけです。では UI が出来たので、Figma の postMessage を受け取って WebAssembly で変換をして DOM に反映する部分を作っていきます。

```js:ui.html
const selectRect = document.getElementById("select");
const selectRgb = document.getElementById("select-rgb");
const complementaryRect = document.getElementById("complementary");
const complementaryRgb = document.getElementById("complementary-rgb");

window.onmessage = ({ data: { pluginMessage } }) => {
  if (pluginMessage.select == null) {
    return;
  }

  const { select } = event.data.pluginMessage;

  // select
  const selectColor = `rgb(${Object.values(select).join(",")})`;
  selectRgb.textContent = selectColor;
  selectRect.style.background = selectColor;
};
```

`figma.ui.postMessage` で投げられた postMessage は `window.onmessage` で受け取ります。受け取ったものは `event.data.pluginMessage` という場所に入っているので `pluginMessage.select` から `rgb` の値を取得します。その結果を DOM へ反映します。

ここまで出来れば後は WebAssembly の `get_complementary_color` に各値をいれてその返り値を同じように DOM に反映すれば完成です！あともう少しです！

# Figma の Plugin を作る最大の難点

ただここが Figma の Plugin を作るのに一番の壁になります。今回 `pkg` というフォルダに `.wasm` のファイルなどがありますが Figma にはリソースを配置する方法が存在していません。（2020/10 月現在）

そのため `pkg` の中身をどこかに配置しなければならないです。またどこでもいいわけではなく、 `.wasm` ファイルを後で `fetch` で取得するためブラウザの `Cross Origin Resource Sharing` の制約にかかります。なのでレスポンスヘッダーをいじれる環境でないと難しいです。

今回は簡単にするため [Netlify](https://www.netlify.com/) へ deploy して使ってみましょう。

## Netlify へ deploy する

Netlify の使い方は割愛しますが、単純に Netlify のコンソールからリポジトリを選んで deploy すればよいだけです。なので GitHub などへコードを push していれば大丈夫です。

ただ deploy する前に 2 点やらなければいけないことがあります。

1. wasm-pack が吐き出す pkg フォルダには `.gitignore` が含まれているので git の管理下にならない
2. Netlify のカスタムヘッダーの記述をする

### wasm-pack が吐き出す pkg フォルダを git に含める

wasm-pack が吐き出した pkg フォルダをみてみると以下のように `.gitignore` が含まれています。

![](https://storage.googleapis.com/zenn-user-upload/6l9kpkg7p1dajjcls0vt8oqjfm53)

[Allow skipping `.gitignore` generation #rustwasm/wasm-pack](https://github.com/rustwasm/wasm-pack/issues/728)

そのため上記の issue の中にもありますが `git add --force pkg` として git へ含めなければいけません。

### Netlify のカスタムヘッダーの記述

Netlify のカスタムヘッダーは [ドキュメント](https://docs.netlify.com/routing/headers/) にある方法で作れば良いです。

`_headers` というファイルを作成して `/*` に対して `Access-Control-Allow-Origin: *` と設定をします。

```text:_headers
/*
  Access-Control-Allow-Origin: *
```

# WebAssembly を JavaScript から操作する

`ui.html` の編集をしていきます。まずは `script` 要素の属性を書き換えなければいけません。今回 wasm-pack でビルドしたものは ESModules という形式で使えるようになっています。そのため `script` 要素も `<script type="module">` と記述する必要があります。

[JavaScript モジュール | MDN](https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Modules)

では中身を書き換えます。

```js:ui.html
import init, {
  get_complementary_color,
} from "https://agitated-rosalind-413dcb.netlify.app/pkg/figma_complementary_color_plugin.js";
```

まず `script` 要素の下で `import` を使って import します。default export されているものと、 `#[wasm_bindgen]` をつけた関数の名前が named export されています。

この default export されている関数は Promise を返します。 `window.onmessage` の関数を `async` にして Promise を待つことにしましょう。

```diff:ui.html
-window.onmessage = ({ data: { pluginMessage } }) => {
+window.onmessage = async ({ data: { pluginMessage } }) => {
  if (pluginMessage.select == null) {
    return;
  }

  const { select } = event.data.pluginMessage;

  // select
  const selectColor = `rgb(${Object.values(select).join(",")})`;
  selectRgb.textContent = selectColor;
  selectRect.style.background = selectColor;

+  await init();
};
```

await の間に内部で `.wasm` ファイルへの fetch などを行ってくれています。そのためこの Promise が fulfilled になれば `get_complementary_color` 関数が使えるようになります。では `get_complementary_color` を使った部分も書いていきます。

```diff:ui.html
window.onmessage = async ({ data: { pluginMessage } }) => {
  if (pluginMessage.select == null) {
    return;
  }

  const { select } = event.data.pluginMessage;

  // select
  const selectColor = `rgb(${Object.values(select).join(",")})`;
  selectRgb.textContent = selectColor;
  selectRect.style.background = selectColor;

  await init();

+  const complementary = get_complementary_color(select.r, select.g, select.b);

+ // complementary
+ const complementaryColor = `rgb(${complementary.join(",")})`;
+ complementaryRgb.textContent = complementaryColor;
+ complementaryRect.style.background = complementaryColor;
};
```

Figma の Plugin を実行してみましょう。

![](https://storage.googleapis.com/zenn-user-upload/3kt5bw19xgeka2m2jjrng4cjptd0)

`Plugins` -> `Development` の中に Plugin があるのでそれをクリックします。

![](https://storage.googleapis.com/zenn-user-upload/cgk1xglmmvctk1dnyi9indix9yad)

🎉 完成です！

# おまけ

今回は説明を省きましたが、 `.wasm` ファイルを最適化するなどまだまだ開発の余地はあるのでチャレンジしたい人はぜひ頑張ってください！

[Shrinking .wasm Size](https://rustwasm.github.io/docs/book/game-of-life/code-size.html)

また今回作ったものは [konojunya/figma_complementary_color_plugin](https://github.com/konojunya/figma_complementary_color_plugin) に全てのソースコードを置いているので、記事の中で迷った場合、参考にしてみてください。
