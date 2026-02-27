---
title: "GoでOGP背景画像を冪等に生成する"
date: 2026-02-28
---

ブログ記事ごとにパステルカラーのふわっとした背景画像を自動生成する仕組みを Go で作った。同じ記事に対しては何度実行しても同一の画像が出力される「冪等性」がポイント。この記事ではその実装を解説する。

# 全体像

このサイトの OGP 画像の背景は `scripts/generate-ogp/` にある Go スクリプトで生成している。記事タイトルをハッシュして得たシード値をもとに、パステルカラーの blob を配置してガウシアンブラーをかけるパイプラインで、依存は `golang.org/x/image` のみ。`go run .` だけで完結する。

# 冪等性のしくみ — タイトルからシードを決定的に生成する

同じ記事に対して毎回同じ画像を出力するために、記事タイトルから決定論的にシード値を生成する。使っているのは FNV-1a ハッシュ。

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

タイトル文字列の各文字を XOR と乗算で畳み込み、下位 24 bit を取って `[0, 1)` の float64 に正規化する。このシード値がこの先のすべてのランダム要素を決定する。

`math/rand` を使っていないのもポイントで、Go の標準ライブラリのランダム実装はバージョンによってアルゴリズムが変わる可能性がある。自前のハッシュなら Go のバージョンが変わっても同じ出力を保証できる。

# 疑似乱数関数

シードとインデックスから `[0, 1)` の浮動小数点を返す関数。色の選択、座標、半径など各パラメータごとにインデックスを変えて呼び出す。

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

`2654435761` は Knuth の乗法ハッシュで使われる黄金比由来の定数。ビットの拡散 (avalanche) に使われる `0xbf58476d1ce4e5b9` や `0x94d049bb133111eb` は [splitmix64](https://xoshiro.di.unimi.it/splitmix64.c) 由来で、シフトと乗算を繰り返すことでビット列を十分に攪拌する。

# パステルカラーのパレット

8 色のパステルカラーパレットを定義している。RGB は `[0, 1]` の float64 で持つ。

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

ピンク〜ラベンダー〜ブルー系を中心に、彩度を抑えた暖色寄りのトーンで揃えている。どの色が選ばれても隣り合う blob と自然に馴染むように設計されている。

# カラーブロブの生成

1 枚の画像につき 7 個の「色の塊 (blob)」を配置する。各 blob は位置 (x, y)、半径、色をシードから決定的に持つ。

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

`i*7` でインデックスをずらすことで、各 blob のパラメータが互いに独立な乱数になる。半径の範囲を `[180, 530]` にしているのは、小さすぎるとブラー後に消えてしまい、大きすぎると画面全体が単色になるため。

# ピクセルシェーディング

各ピクセルに対して、ベースカラーの上に各 blob をガウシアン減衰で混ぜ込み、さらにノイズを加える。GPU のフラグメントシェーダと同じ発想。

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

ガウシアン減衰 `exp(-(d²) / (2σ²))` は、blob の中心からの距離に応じて影響度が滑らかに減少するベル型のカーブ。`w * 0.55` で最大影響度を 55% に制限することで、色が飽和しすぎないようにしている。

`noise()` は低周波のバリューノイズで、微妙な有機的なムラを加える。スケール `0.003` は 1200px の画面に対して 3〜4 個の緩やかな波ができる程度の周波数。

# ノイズ関数

Quintic (5次) 補間による滑らかなバリューノイズ。格子のアーティファクト（直線的なパターン）が出にくい。

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

`ihash()` は格子点の整数座標からハッシュ値を返す関数で、Perlin noise のような勾配ベースではなく値ベースのノイズ。勾配ノイズより実装がシンプルで、今回のように「微かな揺らぎ」が目的なら十分。

# ガウシアンブラー — 分離可能ボックスブラー 3パス

レンダリング後のピクセルバッファに対して半径 40 のガウシアンブラーを適用する。これが「ふわっと感」の決定的な要素。

```go
func gaussianBlur(buf *floatBuf, radius int) {
    tmp := newFloatBuf(buf.w, buf.h)
    for range 3 {
        boxBlurH(buf, tmp, radius)
        boxBlurV(tmp, buf, radius)
    }
}
```

ボックスブラーを 3 回繰り返すとガウシアンブラーに近似できるという性質を利用している（中心極限定理）。さらに水平・垂直に分離 (separable) することで、計算量を `O(w*h*r)` から `O(w*h)` のスライディングウィンドウに落とせる。

```go
func boxBlurH(src, dst *floatBuf, r int) {
    w, h := src.w, src.h
    d := 1.0 / float64(2*r+1)
    var wg sync.WaitGroup
    for row := range h {
        wg.Add(1)
        go func(y int) {
            defer wg.Done()
            // 初期ウィンドウの合計
            var sr, sg, sb float64
            for i := -r; i <= r; i++ {
                cr, cg, cb := src.get(max(0, min(i, w-1)), y)
                sr += cr; sg += cg; sb += cb
            }
            dst.set(0, y, sr*d, sg*d, sb*d)
            // スライディングウィンドウ: 右端を追加、左端を除去
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

各行/列を goroutine で並列処理しており、マルチコアを活かして高速に処理できる。ブラー自体は決定論的なので並列化しても冪等性は壊れない。

# float バッファ

ブラー処理を正確に行うため、uint8 ではなく float64 の中間バッファを使う。

```go
type floatBuf struct {
    w, h int
    pix  []float64 // R, G, B が交互に並ぶ (w * h * 3)
}
```

uint8 で計算すると桁落ちや丸め誤差が蓄積して、ブラー 3 パスを経た結果にバンディング (色の段差) が出てしまう。float64 で演算してから最後に uint8 に変換することで、滑らかなグラデーションを維持する。

# レンダリングパイプライン全体

これまでの要素を組み合わせた全体フロー。

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

パイプラインを図にすると:

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

すべてが `titleSeed(title)` から始まり、途中に非決定的な要素が一切ない。これにより、`make gen` を何度実行してもビット単位で同一の PNG が出力される。

# まとめ

- FNV-1a ハッシュでタイトルから決定的なシードを生成し、すべての乱数をそこから派生させることで冪等性を実現
- パステルカラー 8 色のパレットから選んだ blob をガウシアン減衰で配置し、3 パスのボックスブラーで「ふわっと」させる
- float64 中間バッファと goroutine による行単位の並列処理で、品質と速度を両立
- 依存ライブラリは `golang.org/x/image` のみで、外部ランタイムや GPU を必要としない
