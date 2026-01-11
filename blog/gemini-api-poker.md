---
title: "Gemini API でポーカーの役を判定する"
topics: ["go", "gemini", "gc24"]
published: true
---

# Intro

この記事は 2024/01/29 に行われた[「【Go x Gemini】2024年Gemini APIを使ってみよう 2days Event」](https://gdg-tokyo.connpass.com/event/307689/)で紹介されていた Go の実装を元に Gemini が画像の認識ができることは理解したので、特定のゲームのルールを理解しているかを試してみた記事になります。

イベントは GDG Tokyo で行われ、イベントの動画のアーカイブもあるのでイベントに関するものはそちらをご覧ください。

https://www.youtube.com/watch?v=3ZomyM0expM

# ポーカーの役を判定してみる

今回は一般的なルールとして現在日本でもかなり熱が高くなってきているテキサス・ホールデムを題材とします。ポーカーにはおおよそ 3 つの分類があります。

1. ドローポーカー
2. フロップポーカー
3. スタッドポーカー

今回題材としているテキサス・ホールデムはフロップポーカーの位置付けになります。

## ポーカーの役

ポーカーには 10 個の役があります。今回は最初に配られた 2 枚を、A のハートと K のハートとしてゲームをスタートした前提で進めます。

![](https://storage.googleapis.com/zenn-user-upload/20e54a1720cc-20240203.jpeg)

テーブルはリバーで Q のハートがでた状態になります。

![](https://storage.googleapis.com/zenn-user-upload/abbb96ef3a47-20240203.jpeg)

この時点で完全に役が決定しているためこの 2 枚を Gemini に伝えて、自分は何の役なのかを答えてもらいます。

この 7 枚で構成される最も得点の高い役は、ハートの A / K / Q J / 10 の 5 枚で構成される「ロイヤルストレートフラッシュ」になります。

では早速 Gemini に聞いてみましょう。

# Gemini API を使う

まず Gemini API を使う場合の方法が 2 つあるためこの記事でも書いておきます。

1. Google AI Studio Gemini API を使う方法
2. Vertex AI の Gemini API を使う方法

この記事では、無料ですぐに試せる Google AI Studio の Gemini API から使ってみます。以下のページから API キーを取得するを押下し、API キーの発行をしてください。

https://ai.google.dev/tutorials/go_quickstart?hl=ja

API キーの発行をした際に、もしエラーになったりトラブルシューティングの画面になった場合、Google Workspace にて「早期アクセスアプリ」が off になっている可能性があります。またデフォルト設定では off です。Google Workspace 管理者に伝えて早期アクセスアプリを on にした状態でページをリロードし再度試してください。

また on にしても動かない場合、 Core Data Access が off になっている可能性があります。早期アクセスアプリと同じ箇所に設定はありますがこれにもチェックをつけていないと API キーの発行が出来ません。

![](https://storage.googleapis.com/zenn-user-upload/fbdd58bc5f5b-20240203.jpg)

![](https://storage.googleapis.com/zenn-user-upload/88ab900da900-20240203.jpg)

## Go のコードを書く

Go のコードは全部で 62 行の非常にシンプルな作りになります。

```go
package main

import (
	"context"
	"fmt"
	"os"

  "github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

func main() {
  ctx := context.Background()

	if err := run(ctx); err != nil {
		fmt.Fprintln(os.Stderr, "Error:", err)
		os.Exit(1)
	}
}

// Gemini のレスポンスを表示するために作る Utility function
func printCandinates(cs []*genai.Candidate) {
	for _, c := range cs {
		for _, p := range c.Content.Parts {
			fmt.Println(p)
		}
	}
}

func run(ctx context.Context) error {
  return nil
}
```

まずは context を作成し、特定の関数へ渡し、error の return を受け取ってプログラムを終了させます。実際のコードはこの `run` の中に書いていきます。

まずは `genai.NewClient` を使ってクライアントを作ります。

```go
client, err := genai.NewClient(ctx, option.WithAPIKey(os.Getenv("API_KEY")))
if err != nil {
  return err
}
defer client.Close()
```

この client を使って Gemini のモデルを指定します。

:::message
Gemini には Nano / Pro / Ultra の 3 種類あり、Nano は Google Pixel に埋め込まれている Gemini です。API 利用では Pro / Ultra が使えますが、現状はまだ Pro しか使えないようです。
:::

モデルは `gemini-pro` と `gemini-pro-vision` が使えますが、画像の認識をさせたいため `gemini-pro-vision` を使います。

```go
model := client.GenerativeModel("gemini-pro-vision")
```

では、このモデルに対して prompt を渡します。まずは画像を 2 枚読み込んでプロンプトは「この 2 枚の画像はなんですか？詳しくそれぞれの画像の説明をしてください。」と聞いてみましょう。

```go
tableImage, err := os.ReadFile("images/table.jpeg")
if err != nil {
  return err
}

handImage, err := os.ReadFile("images/hand.jpeg")
if err != nil {
  return err
}

prompt := []genai.Part{
  genai.ImageData("jpeg", tableImage),
  genai.ImageData("jpeg", handImage),
  genai.Text("この2枚の画像はなんですか？詳しくそれぞれの画像の説明をしてください。"),
}

resp, err := model.GenerateContent(ctx, prompt...)
if err != nil {
  return err
}

printCandinates(resp.Candidates)

return nil
```

これで全てのコードを書き終えました。では、実行して聞いてみましょう。

![](https://storage.googleapis.com/zenn-user-upload/af9fbb96c311-20240203.png)

しっかりとトランプであること、また数字や絵柄も捉えてるようです。

このプロンプトでは「ポーカーをしている」ということは伝えていませんが次は役を考えてもらうためプロンプトの文字を「あなたはポーカープレイヤーです。1 枚目の画像はテーブルの画像。2 枚目はハンドの画像です。この場合の役を答えてください。」に変更してみましょう。

![](https://storage.googleapis.com/zenn-user-upload/ead72e871c7e-20240203.png)

ハンドが何で、テーブル上には何があって、役はどれに当たるのかをしっかり回答してくれました！🎉

現在この Gemini からの返答は大体 3~5s ほど待つでしょう。これがもっと早くなればポーカー大会の配信などをしてるアプリケーションや YouTube ライブの映像から、役をみて即座に勝敗がわかったり、全員のターンをこの文脈として保存することで今打つべき最適な手をアシストしてくれるアプリケーションは簡単に作ることができるでしょう。Gemini 最高！

# Outro

この記事ではポーカーを題材にしましたが、実際は麻雀をやってみようと思っていました。ポーカーはすぐに役がわかるものなので Gemini で出来るだろうと思って記事を書きましたが、麻雀は役が 1 つではなく複数に跨るのがほとんどです。例えばピンズのみで構成したもので立直をして、「立直、清一色」で和了したとしても実は一盃口がついてるとか、赤ドラがあるとかなど識別だけでも役の数はかなり変わります。そのため Gemini の勿体無い使い方としてかなり有効だと考えましたが牌自体の認識の精度が低いのではむずかしいです。
以下はその嘆きのポストです。

https://x.com/konojunya/status/1753599617173000207?s=20

またこの記事で使ったコードを置いています。参考にしてください。

https://github.com/konojunya/sandbox/tree/main/gemini-api
