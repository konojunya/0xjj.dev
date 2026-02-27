---
title: "GoでOGP背景画像を冪等に生成する"
date: 2026-02-28
---

このサイトではブログ記事ごとにパステルカラーのふわっとした OGP 背景画像を自動生成しています。同じ記事に対して何度実行しても同一の画像が出力される「冪等性」を持たせているのがこだわりポイントで、今回はその Go 実装を解説していきます。

# やりたいこと

OGP 画像の背景として、記事ごとに異なるパステルカラーのグラデーション画像がほしいです。ただし以下の制約があります。

- 同じ記事タイトルからは常に同じ画像が生成される（冪等）
- Go のバージョンが変わっても出力が変わらない
- 外部サービスや GPU に依存しない

これを `scripts/generate-ogp/` に置いた Go スクリプトで実現しています。依存は `golang.org/x/image` のみで、`go run .` だけで完結します。

# タイトルからシードを作る

まずは冪等性の核となる部分から見ていきます。記事タイトルの文字列から決定論的にシード値を生成する関数を用意します。使っているのは FNV-1a ハッシュです。

```go
func titleSeed(title string) float64 {
    var h uint64 = 14695981039346656037 // FNV offset basis
    for _, c := range title {
        h ^= uint64(c)
        h *= 1099511628211 // FNV prime
    }
    return float64(h&0xFFFFFF) / float64(0x1000000)
}
```

タイトル文字列の各文字を XOR と乗算で畳み込んで、下位 24 bit を取って `[0, 1)` の float64 に正規化します。このシード値がこの先のすべてのランダム要素を決定します。

ここで `math/rand` を使っていないのもポイントで、Go の標準ライブラリのランダム実装はバージョンによってアルゴリズムが変わる可能性があります。自前のハッシュにしておけば Go のバージョンが変わっても同じ出力を保証できます。

## 疑似乱数関数

シードから個々のパラメータ（色、座標、半径など）を取り出すために、シードとインデックスから `[0, 1)` の浮動小数点を返す関数も用意します。

```go
func prand(seed float64, idx int) float64 {
    h := math.Float64bits(seed) ^ uint64(idx)*2654435761
    h ^= h >> 17
    h *= 0xbf58476d1ce4e5b9
    h ^= h >> 31
    h *= 0x94d049bb133111eb
    h ^= h >> 32
    return float64(h&0xFFFFFF) / float64(0x1000000)
}
```

`2654435761` は Knuth の乗法ハッシュで使われる黄金比由来の定数で、`0xbf58476d1ce4e5b9` や `0x94d049bb133111eb` は [splitmix64](https://xoshiro.di.unimi.it/splitmix64.c) 由来のものです。シフトと乗算を繰り返すことでビット列を十分に攪拌しています。

# パステルカラーの設計

次に色の設計をしていきます。8 色のパステルカラーパレットを定義します。RGB は `[0, 1]` の float64 で持ちます。

```go
var pastelPalette = [][3]float64{
    {1.00, 0.72, 0.77}, // pastel pink
    {1.00, 0.82, 0.70}, // peach
    {0.84, 0.74, 0.94}, // lavender
    {0.77, 0.60, 0.86}, // purple
    {0.68, 0.78, 0.92}, // soft blue
    {0.95, 0.77, 0.83}, // dusty rose
    {0.74, 0.70, 0.95}, // periwinkle
    {1.00, 0.90, 0.82}, // warm cream
}
```

ピンク〜ラベンダー〜ブルー系を中心に、彩度を抑えた暖色寄りのトーンで揃えています。どの色が選ばれても隣り合う blob と自然に馴染むようにしたかったので、極端に浮く色は入れていません。

## カラーブロブの生成

1 枚の画像につき 7 個の「色の塊 (blob)」を配置します。各 blob の位置・半径・色はすべてシードから決定的に導出します。

```go
func generateBlobs(seed float64) []colorBlob {
    blobs := make([]colorBlob, numBlobs) // numBlobs = 7
    for i := range numBlobs {
        ci := int(prand(seed, i*7+3) * float64(len(pastelPalette)))
        blobs[i] = colorBlob{
            px:     prand(seed, i*7) * imgW,       // x: [0, 1200]
            py:     prand(seed, i*7+1) * imgH,     // y: [0, 630]
            radius: 180 + prand(seed, i*7+2)*350,  // radius: [180, 530]
            col:    pastelPalette[ci],
        }
    }
    return blobs
}
```

`i*7` でインデックスをずらすことで、各 blob のパラメータが互いに独立な乱数になります。半径の範囲を `[180, 530]` にしているのは、小さすぎるとブラー後に消えてしまいますし、大きすぎると画面全体が単色になってしまうためです。

# ピクセルシェーディング

ここからが画像生成の本体です。各ピクセルに対して、ベースカラーの上に各 blob をガウシアン減衰で混ぜ込み、さらにノイズを加えます。やっていることは GPU のフラグメントシェーダと同じ発想です。

```go
func shadePixel(x, y int, seed float64, blobs []colorBlob) (float64, float64, float64) {
    col := [3]float64{0.96, 0.93, 0.95} // warm pastel base

    px, py := float64(x), float64(y)
    for _, b := range blobs {
        dx := px - b.px
        dy := py - b.py
        w := math.Exp(-(dx*dx + dy*dy) / (2 * b.radius * b.radius))
        s := w * 0.55
        col[0] = lerp(col[0], b.col[0], s)
        col[1] = lerp(col[1], b.col[1], s)
        col[2] = lerp(col[2], b.col[2], s)
    }

    n := noise(float64(x)*0.003+seed*97, float64(y)*0.003+seed*53)
    col[0] += (n - 0.5) * 0.04
    col[1] += (n - 0.5) * 0.03
    col[2] += (n - 0.5) * 0.04

    return col[0], col[1], col[2]
}
```

上から順に見ていくと、まずベースカラー `{0.96, 0.93, 0.95}` でほんのりピンクがかったウォームトーンを敷きます。そこに各 blob を重ねていきます。

ガウシアン減衰 `exp(-(d²) / (2σ²))` は blob の中心からの距離に応じて影響度が滑らかに減少するベル型のカーブで、`w * 0.55` で最大影響度を 55% に制限することで色が飽和しすぎないようにしています。

最後に `noise()` で微妙な有機的ムラを加えます。スケール `0.003` は 1200px の画面に対して 3〜4 個の緩やかな波ができる程度の周波数になっています。

## ノイズ関数

ノイズには Quintic (5次) 補間によるバリューノイズを使っています。

```go
func noise(x, y float64) float64 {
    ix := int(math.Floor(x))
    iy := int(math.Floor(y))
    fx := x - math.Floor(x)
    fy := y - math.Floor(y)
    // quintic interpolation: 6t^5 - 15t^4 + 10t^3
    ux := fx * fx * fx * (fx*(fx*6-15) + 10)
    uy := fy * fy * fy * (fy*(fy*6-15) + 10)
    return lerp(
        lerp(ihash(ix, iy), ihash(ix+1, iy), ux),
        lerp(ihash(ix, iy+1), ihash(ix+1, iy+1), ux),
        uy,
    )
}
```

`ihash()` は格子点の整数座標からハッシュ値を返す関数で、Perlin noise のような勾配ベースではなく値ベースのノイズになっています。勾配ノイズより実装がシンプルで、今回のように「微かな揺らぎ」が目的なら十分です。Quintic 補間にしているのは格子のアーティファクト（直線的なパターン）が出にくいためです。

# ガウシアンブラー

レンダリング後のピクセルバッファに対して半径 40 のガウシアンブラーを適用します。これが「ふわっと感」の決め手になっています。

```go
func gaussianBlur(buf *floatBuf, radius int) {
    tmp := newFloatBuf(buf.w, buf.h)
    for range 3 {
        boxBlurH(buf, tmp, radius)
        boxBlurV(tmp, buf, radius)
    }
}
```

ボックスブラーを 3 回繰り返すとガウシアンブラーに近似できるという性質を利用しています（中心極限定理）。さらに水平・垂直に分離 (separable) することで、計算量をスライディングウィンドウの `O(w*h)` まで落とせます。

## スライディングウィンドウによるボックスブラー

では実際のボックスブラーの実装を見ていきます。水平方向の例がこちらです。

```go
func boxBlurH(src, dst *floatBuf, r int) {
    w, h := src.w, src.h
    d := 1.0 / float64(2*r+1)
    var wg sync.WaitGroup
    for row := range h {
        wg.Add(1)
        go func(y int) {
            defer wg.Done()
            var sr, sg, sb float64
            for i := -r; i <= r; i++ {
                cr, cg, cb := src.get(max(0, min(i, w-1)), y)
                sr += cr; sg += cg; sb += cb
            }
            dst.set(0, y, sr*d, sg*d, sb*d)
            for x := 1; x < w; x++ {
                ar, ag, ab := src.get(min(x+r, w-1), y)
                rr, rg, rb := src.get(max(x-r-1, 0), y)
                sr += ar - rr; sg += ag - rg; sb += ab - rb
                dst.set(x, y, sr*d, sg*d, sb*d)
            }
        }(row)
    }
    wg.Wait()
}
```

最初のループで幅 `2r+1` のウィンドウ合計を求めて、そこからは右端のピクセルを足して左端のピクセルを引くだけです。各行を goroutine で並列処理しているので、マルチコアを活かして高速に動きます。ブラー自体は決定論的なので並列化しても冪等性は壊れません。

## float バッファを使う理由

ブラー処理には uint8 ではなく float64 の中間バッファを使っています。

```go
type floatBuf struct {
    w, h int
    pix  []float64 // R, G, B が交互に並ぶ (w * h * 3)
}
```

uint8 のまま計算すると桁落ちや丸め誤差が蓄積して、ブラー 3 パスを経た結果にバンディング（色の段差）が出てしまいます。float64 で演算して最後に uint8 に変換することで、滑らかなグラデーションを維持できます。

# レンダリングパイプライン

ここまでの要素を組み合わせた全体フローがこちらです。

```go
func renderBackground(seed float64) *image.RGBA {
    blobs := generateBlobs(seed)      // 1. シードから7個のblobを決定的に生成
    buf := newFloatBuf(imgW, imgH)    // 2. 1200×630のfloatバッファを確保

    var wg sync.WaitGroup
    for row := range imgH {           // 3. 各行を並列にシェーディング
        wg.Add(1)
        go func(y int) {
            defer wg.Done()
            for x := range imgW {
                r, g, b := shadePixel(x, y, seed, blobs)
                buf.set(x, y, r, g, b)
            }
        }(row)
    }
    wg.Wait()

    gaussianBlur(buf, blurR)          // 4. 半径40のガウシアンブラー
    return buf.toRGBA()               // 5. float→uint8に変換してRGBA画像へ
}
```

図にするとこのようになります。

```
タイトル → FNV-1a → seed → prand() → 7 blobs
                                         ↓
                              shadePixel (ガウシアン減衰 + ノイズ)
                                         ↓
                              float64 バッファ (1200×630×3)
                                         ↓
                              ボックスブラー × 3 (H+V)
                                         ↓
                              uint8 RGBA → PNG 出力
```

すべてが `titleSeed(title)` から始まり、途中に非決定的な要素が一切ありません。そのため `make gen` を何度実行してもビット単位で同一の PNG が出力されます。
