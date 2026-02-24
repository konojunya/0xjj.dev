// generate-ogp generates soft gradient-mesh background images for OGP.
// Pastel color blobs with heavy gaussian blur produce a dreamy, ethereal look.
// Text is overlaid separately by Astro's SSG pipeline.
//
// Usage (from repo root):
//
//	go run ./scripts/generate-ogp/
//	go run ./scripts/generate-ogp/ -root /path/to/repo
package main

import (
	"bufio"
	"flag"
	"fmt"
	"image"
	"image/png"
	"math"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

const (
	imgW     = 1200
	imgH     = 630
	blurR    = 40
	numBlobs = 7
)

// ── Data ──────────────────────────────────────────────────────────────────

type Post struct {
	Slug  string
	Title string
	Date  time.Time
}

// ── Shader math ───────────────────────────────────────────────────────────

func lerp(a, b, t float64) float64 { return a + (b-a)*t }

func clamp01(x float64) float64 {
	if x < 0 {
		return 0
	}
	if x > 1 {
		return 1
	}
	return x
}

// prand derives a pseudo-random float in [0,1) from a seed and an integer index.
func prand(seed float64, idx int) float64 {
	h := math.Float64bits(seed) ^ uint64(idx)*2654435761
	h ^= h >> 17
	h *= 0xbf58476d1ce4e5b9
	h ^= h >> 31
	h *= 0x94d049bb133111eb
	h ^= h >> 32
	return float64(h&0xFFFFFF) / float64(0x1000000)
}

func ihash(ix, iy int) float64 {
	h := ix*374761393 + iy*668265263
	h ^= h >> 13
	h *= 1274126177
	h ^= h >> 16
	return float64(uint32(h)) / 4294967296.0
}

// noise returns smooth value noise using quintic interpolation for
// extra-soft gradients (no visible grid artefacts).
func noise(x, y float64) float64 {
	ix := int(math.Floor(x))
	iy := int(math.Floor(y))
	fx := x - math.Floor(x)
	fy := y - math.Floor(y)
	ux := fx * fx * fx * (fx*(fx*6-15) + 10)
	uy := fy * fy * fy * (fy*(fy*6-15) + 10)
	return lerp(
		lerp(ihash(ix, iy), ihash(ix+1, iy), ux),
		lerp(ihash(ix, iy+1), ihash(ix+1, iy+1), ux),
		uy,
	)
}

// ── Pastel palette & color blobs ──────────────────────────────────────────

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

type colorBlob struct {
	px, py float64
	radius float64
	col    [3]float64
}

func generateBlobs(seed float64) []colorBlob {
	blobs := make([]colorBlob, numBlobs)
	for i := range numBlobs {
		ci := int(prand(seed, i*7+3) * float64(len(pastelPalette)))
		if ci >= len(pastelPalette) {
			ci = len(pastelPalette) - 1
		}
		blobs[i] = colorBlob{
			px:     prand(seed, i*7) * imgW,
			py:     prand(seed, i*7+1) * imgH,
			radius: 180 + prand(seed, i*7+2)*350,
			col:    pastelPalette[ci],
		}
	}
	return blobs
}

// shadePixel blends soft radial blooms over a warm pastel base,
// then adds very low-frequency noise for subtle organic variation.
func shadePixel(x, y int, seed float64, blobs []colorBlob) (float64, float64, float64) {
	col := [3]float64{0.96, 0.93, 0.95}

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

// ── Float buffer for blur pipeline ────────────────────────────────────────

type floatBuf struct {
	w, h int
	pix  []float64
}

func newFloatBuf(w, h int) *floatBuf {
	return &floatBuf{w: w, h: h, pix: make([]float64, w*h*3)}
}

func (f *floatBuf) set(x, y int, r, g, b float64) {
	i := (y*f.w + x) * 3
	f.pix[i] = r
	f.pix[i+1] = g
	f.pix[i+2] = b
}

func (f *floatBuf) get(x, y int) (float64, float64, float64) {
	i := (y*f.w + x) * 3
	return f.pix[i], f.pix[i+1], f.pix[i+2]
}

func (f *floatBuf) toRGBA() *image.RGBA {
	img := image.NewRGBA(image.Rect(0, 0, f.w, f.h))
	for y := range f.h {
		for x := range f.w {
			r, g, b := f.get(x, y)
			off := img.PixOffset(x, y)
			img.Pix[off] = uint8(clamp01(r) * 255)
			img.Pix[off+1] = uint8(clamp01(g) * 255)
			img.Pix[off+2] = uint8(clamp01(b) * 255)
			img.Pix[off+3] = 255
		}
	}
	return img
}

// ── Separable box blur (3-pass ≈ gaussian) ────────────────────────────────

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
				sr += cr
				sg += cg
				sb += cb
			}
			dst.set(0, y, sr*d, sg*d, sb*d)
			for x := 1; x < w; x++ {
				ar, ag, ab := src.get(min(x+r, w-1), y)
				rr, rg, rb := src.get(max(x-r-1, 0), y)
				sr += ar - rr
				sg += ag - rg
				sb += ab - rb
				dst.set(x, y, sr*d, sg*d, sb*d)
			}
		}(row)
	}
	wg.Wait()
}

func boxBlurV(src, dst *floatBuf, r int) {
	w, h := src.w, src.h
	d := 1.0 / float64(2*r+1)
	var wg sync.WaitGroup
	for col := range w {
		wg.Add(1)
		go func(x int) {
			defer wg.Done()
			var sr, sg, sb float64
			for i := -r; i <= r; i++ {
				cr, cg, cb := src.get(x, max(0, min(i, h-1)))
				sr += cr
				sg += cg
				sb += cb
			}
			dst.set(x, 0, sr*d, sg*d, sb*d)
			for y := 1; y < h; y++ {
				ar, ag, ab := src.get(x, min(y+r, h-1))
				rr, rg, rb := src.get(x, max(y-r-1, 0))
				sr += ar - rr
				sg += ag - rg
				sb += ab - rb
				dst.set(x, y, sr*d, sg*d, sb*d)
			}
		}(col)
	}
	wg.Wait()
}

// gaussianBlur approximates heavy gaussian blur via 3 passes of
// separable box blur (H+V). 3-pass with radius 40 ≈ σ≈40.
func gaussianBlur(buf *floatBuf, radius int) {
	tmp := newFloatBuf(buf.w, buf.h)
	for range 3 {
		boxBlurH(buf, tmp, radius)
		boxBlurV(tmp, buf, radius)
	}
}

// ── Render ───────────────────────────────────────────────────────────────

func renderBackground(seed float64) *image.RGBA {
	blobs := generateBlobs(seed)
	buf := newFloatBuf(imgW, imgH)

	var wg sync.WaitGroup
	for row := range imgH {
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

	gaussianBlur(buf, blurR)

	return buf.toRGBA()
}

// ── Seed ─────────────────────────────────────────────────────────────────

func titleSeed(title string) float64 {
	var h uint64 = 14695981039346656037
	for _, c := range title {
		h ^= uint64(c)
		h *= 1099511628211
	}
	return float64(h&0xFFFFFF) / float64(0x1000000)
}

// ── Frontmatter parser ────────────────────────────────────────────────────

func parsePost(path, slug string) Post {
	f, err := os.Open(path)
	if err != nil {
		panic(err)
	}
	defer f.Close()

	var title string
	var date time.Time
	inFM := false

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		if line == "---" {
			if !inFM {
				inFM = true
				continue
			}
			break
		}
		if !inFM {
			continue
		}
		k, v, ok := strings.Cut(line, ":")
		if !ok {
			continue
		}
		k = strings.TrimSpace(k)
		v = strings.TrimSpace(strings.Trim(v, `"'`))
		switch k {
		case "title":
			title = v
		case "date":
			if t, err := time.Parse("2006-01-02", v); err == nil {
				date = t
			}
		}
	}
	return Post{Slug: slug, Title: title, Date: date}
}

// ── Main ──────────────────────────────────────────────────────────────────

func main() {
	root := flag.String("root", ".", "path to repo root (default: current directory)")
	flag.Parse()

	contentDir := filepath.Join(*root, "sites", "0xjj.dev", "src", "content", "blog")
	outputDir := filepath.Join(*root, "sites", "0xjj.dev", "public", "og", "bg")

	if err := os.MkdirAll(outputDir, 0o755); err != nil {
		fmt.Fprintf(os.Stderr, "mkdir: %v\n", err)
		os.Exit(1)
	}

	entries, err := os.ReadDir(contentDir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "readdir %s: %v\n", contentDir, err)
		os.Exit(1)
	}

	for _, entry := range entries {
		name := entry.Name()
		if !strings.HasSuffix(name, ".md") {
			continue
		}
		slug := strings.TrimSuffix(name, ".md")
		post := parsePost(filepath.Join(contentDir, name), slug)
		if post.Title == "" {
			fmt.Printf("skip (no title): %s\n", slug)
			continue
		}

		fmt.Printf("generating %s ...\n", slug)
		img := renderBackground(titleSeed(post.Title))

		outPath := filepath.Join(outputDir, slug+".png")
		out, err := os.Create(outPath)
		if err != nil {
			fmt.Fprintf(os.Stderr, "create %s: %v\n", outPath, err)
			continue
		}
		if err := png.Encode(out, img); err != nil {
			fmt.Fprintf(os.Stderr, "encode: %v\n", err)
		}
		out.Close()
		fmt.Printf("  → %s\n", outPath)
	}
}
