'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ─── constants ───────────────────────────────────────────────────────────────

const OGP_W = 1200;
const OGP_H = 630;
const NUM_CLUSTERS = 7;
const MAX_SAMPLE_W = 200;

// ─── types ───────────────────────────────────────────────────────────────────

interface ExtractedColor {
  color: [number, number, number]; // RGB 0-255
  x: number;
  y: number;
}

interface GenerationParams {
  lightness: number;   // OKLCH L for pastel blobs (0.6 – 0.95)
  chroma: number;      // chroma multiplier (0.5 – 4.0)
  intensity: number;   // blob lerp weight (0.3 – 0.9)
  blobSize: number;    // blob radius scale (0.5 – 2.0)
  blur: number;        // blur radius in px (0 – 80)
}

const DEFAULT_PARAMS: GenerationParams = {
  lightness: 0.80,
  chroma: 1.2,
  intensity: 0.65,
  blobSize: 1.0,
  blur: 40,
};

// ─── OKLCH color space conversion ────────────────────────────────────────────

function srgbToLinear(c: number): number {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  c = Math.max(0, Math.min(1, c));
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(v * 255);
}

function linearRgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const l_ = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m_ = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s_ = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l = Math.cbrt(l_);
  const m = Math.cbrt(m_);
  const s = Math.cbrt(s_);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

function oklabToLinearRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

function rgbToOklch(r: number, g: number, b: number): [number, number, number] {
  const [L, a, bv] = linearRgbToOklab(srgbToLinear(r), srgbToLinear(g), srgbToLinear(b));
  const C = Math.sqrt(a * a + bv * bv);
  const H = Math.atan2(bv, a);
  return [L, C, H];
}

function oklchToRgb(L: number, C: number, H: number): [number, number, number] {
  const a = C * Math.cos(H);
  const b = C * Math.sin(H);
  const [lr, lg, lb] = oklabToLinearRgb(L, a, b);
  return [linearToSrgb(lr), linearToSrgb(lg), linearToSrgb(lb)];
}

// ─── OKLab distance for k-means ──────────────────────────────────────────────

function oklabDistSq(a: [number, number, number], b: [number, number, number]): number {
  const dL = a[0] - b[0];
  const da = a[1] - b[1];
  const db = a[2] - b[2];
  return dL * dL + da * da + db * db;
}

// ─── k-means++ in OKLab ─────────────────────────────────────────────────────

interface PixelData { r: number; g: number; b: number; x: number; y: number }

function kMeans(pixels: PixelData[], k: number, maxIter: number): ExtractedColor[] {
  if (pixels.length === 0) return [];
  if (pixels.length <= k) {
    return pixels.map((p) => ({ color: [p.r, p.g, p.b], x: p.x, y: p.y }));
  }

  const labPixels = pixels.map((p) =>
    linearRgbToOklab(srgbToLinear(p.r), srgbToLinear(p.g), srgbToLinear(p.b)),
  );

  const centroids: [number, number, number][] = [];
  const firstIdx = Math.floor(Math.random() * pixels.length);
  centroids.push([...labPixels[firstIdx]]);

  for (let c = 1; c < k; c++) {
    const dists = labPixels.map((lab) =>
      Math.min(...centroids.map((cent) => oklabDistSq(lab, cent))),
    );
    const total = dists.reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < dists.length; i++) {
      rand -= dists[i];
      if (rand <= 0) { idx = i; break; }
    }
    centroids.push([...labPixels[idx]]);
  }

  const assignments = new Int32Array(pixels.length);

  for (let iter = 0; iter < maxIter; iter++) {
    for (let i = 0; i < labPixels.length; i++) {
      let minDist = Infinity;
      let minIdx = 0;
      for (let j = 0; j < k; j++) {
        const d = oklabDistSq(labPixels[i], centroids[j]);
        if (d < minDist) { minDist = d; minIdx = j; }
      }
      assignments[i] = minIdx;
    }

    const sums = Array.from({ length: k }, () => [0, 0, 0]);
    const counts = new Int32Array(k);
    for (let i = 0; i < labPixels.length; i++) {
      const c = assignments[i];
      sums[c][0] += labPixels[i][0]; sums[c][1] += labPixels[i][1]; sums[c][2] += labPixels[i][2];
      counts[c]++;
    }

    let maxShift = 0;
    for (let j = 0; j < k; j++) {
      if (counts[j] === 0) continue;
      const nL = sums[j][0] / counts[j], nA = sums[j][1] / counts[j], nB = sums[j][2] / counts[j];
      const shift = oklabDistSq(centroids[j], [nL, nA, nB]);
      if (shift > maxShift) maxShift = shift;
      centroids[j] = [nL, nA, nB];
    }
    if (maxShift < 0.0001) break;
  }

  const result: ExtractedColor[] = [];
  for (let j = 0; j < k; j++) {
    let bestDist = Infinity, bestIdx = 0;
    for (let i = 0; i < labPixels.length; i++) {
      if (assignments[i] !== j) continue;
      const d = oklabDistSq(labPixels[i], centroids[j]);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    result.push({ color: [pixels[bestIdx].r, pixels[bestIdx].g, pixels[bestIdx].b], x: pixels[bestIdx].x, y: pixels[bestIdx].y });
  }
  return result;
}

// ─── extract pixels ──────────────────────────────────────────────────────────

function extractPixels(img: HTMLImageElement): PixelData[] {
  const canvas = document.createElement('canvas');
  const scale = img.naturalWidth > MAX_SAMPLE_W ? MAX_SAMPLE_W / img.naturalWidth : 1;
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  const pixels: PixelData[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    pixels.push({
      r: data[i], g: data[i + 1], b: data[i + 2],
      x: (idx % canvas.width) / scale,
      y: Math.floor(idx / canvas.width) / scale,
    });
  }
  return pixels;
}

// ─── pseudo-random ───────────────────────────────────────────────────────────

function prand(seed: number, idx: number): number {
  let h = (seed * 2654435761 + idx * 2654435761) >>> 0;
  h ^= h >>> 17; h = Math.imul(h, 0xbf58476d) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0x94d049bb) >>> 0;
  h ^= h >>> 16;
  return (h & 0xffffff) / 0x1000000;
}

// ─── value noise ─────────────────────────────────────────────────────────────

function ihash(ix: number, iy: number): number {
  let h = ix * 374761393 + iy * 668265263;
  h ^= h >> 13; h = Math.imul(h, 1274126177); h ^= h >> 16;
  return (h >>> 0) / 4294967296.0;
}

function noise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  return lerp(
    lerp(ihash(ix, iy), ihash(ix + 1, iy), ux),
    lerp(ihash(ix, iy + 1), ihash(ix + 1, iy + 1), ux),
    uy,
  );
}

// ─── separable box blur ─────────────────────────────────────────────────────

function boxBlurH(src: Float64Array, dst: Float64Array, w: number, h: number, r: number) {
  const d = 1.0 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    let sr = 0, sg = 0, sb = 0;
    for (let i = -r; i <= r; i++) {
      const off = (y * w + Math.max(0, Math.min(i, w - 1))) * 3;
      sr += src[off]; sg += src[off + 1]; sb += src[off + 2];
    }
    const row = y * w;
    dst[row * 3] = sr * d; dst[row * 3 + 1] = sg * d; dst[row * 3 + 2] = sb * d;
    for (let x = 1; x < w; x++) {
      const ao = (y * w + Math.min(x + r, w - 1)) * 3;
      const ro = (y * w + Math.max(x - r - 1, 0)) * 3;
      sr += src[ao] - src[ro]; sg += src[ao + 1] - src[ro + 1]; sb += src[ao + 2] - src[ro + 2];
      const o = (row + x) * 3;
      dst[o] = sr * d; dst[o + 1] = sg * d; dst[o + 2] = sb * d;
    }
  }
}

function boxBlurV(src: Float64Array, dst: Float64Array, w: number, h: number, r: number) {
  const d = 1.0 / (2 * r + 1);
  for (let x = 0; x < w; x++) {
    let sr = 0, sg = 0, sb = 0;
    for (let i = -r; i <= r; i++) {
      const off = (Math.max(0, Math.min(i, h - 1)) * w + x) * 3;
      sr += src[off]; sg += src[off + 1]; sb += src[off + 2];
    }
    dst[x * 3] = sr * d; dst[x * 3 + 1] = sg * d; dst[x * 3 + 2] = sb * d;
    for (let y = 1; y < h; y++) {
      const ao = (Math.min(y + r, h - 1) * w + x) * 3;
      const ro = (Math.max(y - r - 1, 0) * w + x) * 3;
      sr += src[ao] - src[ro]; sg += src[ao + 1] - src[ro + 1]; sb += src[ao + 2] - src[ro + 2];
      const o = (y * w + x) * 3;
      dst[o] = sr * d; dst[o + 1] = sg * d; dst[o + 2] = sb * d;
    }
  }
}

function gaussianBlur(buf: Float64Array, w: number, h: number, radius: number) {
  if (radius < 1) return;
  const tmp = new Float64Array(buf.length);
  for (let pass = 0; pass < 3; pass++) {
    boxBlurH(buf, tmp, w, h, radius);
    boxBlurV(tmp, buf, w, h, radius);
  }
}

// ─── OGP background generation ──────────────────────────────────────────────

interface BlobDef { px: number; py: number; radius: number; col: [number, number, number] }

function generateOgpBackground(
  colors: ExtractedColor[],
  canvas: HTMLCanvasElement,
  params: GenerationParams,
) {
  canvas.width = OGP_W;
  canvas.height = OGP_H;
  const ctx = canvas.getContext('2d')!;

  let avgR = 0, avgG = 0, avgB = 0;
  for (const c of colors) { avgR += c.color[0]; avgG += c.color[1]; avgB += c.color[2]; }
  avgR /= colors.length; avgG /= colors.length; avgB /= colors.length;
  const seed = ((avgR * 256 + avgG) * 256 + avgB) >>> 0;

  const blobs: BlobDef[] = colors.map((c, i) => {
    const [, C, H] = rgbToOklch(c.color[0], c.color[1], c.color[2]);
    const pastelC = Math.min(C * params.chroma, 0.4);
    const [pr, pg, pb] = oklchToRgb(params.lightness, pastelC, H);
    return {
      px: prand(seed, i * 7) * OGP_W,
      py: prand(seed, i * 7 + 1) * OGP_H,
      radius: (180 + prand(seed, i * 7 + 2) * 350) * params.blobSize,
      col: [pr / 255, pg / 255, pb / 255],
    };
  });

  // Base color
  const [, avgC, avgH] = rgbToOklch(Math.round(avgR), Math.round(avgG), Math.round(avgB));
  const baseL = Math.min(params.lightness + 0.1, 0.96);
  const [br, bg, bb] = oklchToRgb(baseL, Math.min(avgC * params.chroma * 0.4, 0.08), avgH);
  const baseCol: [number, number, number] = [br / 255, bg / 255, bb / 255];

  // Per-pixel shading
  const buf = new Float64Array(OGP_W * OGP_H * 3);
  const seedF = seed / 0x1000000;

  for (let y = 0; y < OGP_H; y++) {
    for (let x = 0; x < OGP_W; x++) {
      let r = baseCol[0], g = baseCol[1], b = baseCol[2];
      for (const blob of blobs) {
        const dx = x - blob.px, dy = y - blob.py;
        const w = Math.exp(-(dx * dx + dy * dy) / (2 * blob.radius * blob.radius));
        const s = w * params.intensity;
        r += (blob.col[0] - r) * s;
        g += (blob.col[1] - g) * s;
        b += (blob.col[2] - b) * s;
      }
      const n = noise(x * 0.003 + seedF * 97, y * 0.003 + seedF * 53);
      r += (n - 0.5) * 0.04; g += (n - 0.5) * 0.03; b += (n - 0.5) * 0.04;
      const off = (y * OGP_W + x) * 3;
      buf[off] = r; buf[off + 1] = g; buf[off + 2] = b;
    }
  }

  gaussianBlur(buf, OGP_W, OGP_H, Math.round(params.blur));

  const imageData = ctx.createImageData(OGP_W, OGP_H);
  const data = imageData.data;
  for (let i = 0; i < OGP_W * OGP_H; i++) {
    const fi = i * 3, pi = i * 4;
    data[pi] = Math.max(0, Math.min(255, Math.round(buf[fi] * 255)));
    data[pi + 1] = Math.max(0, Math.min(255, Math.round(buf[fi + 1] * 255)));
    data[pi + 2] = Math.max(0, Math.min(255, Math.round(buf[fi + 2] * 255)));
    data[pi + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
}

// ─── slider component ────────────────────────────────────────────────────────

function ParamSlider({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="w-24 shrink-0 font-mono text-xs text-muted">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[color-mix(in_srgb,var(--color-fg)_15%,transparent)] accent-fg [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-fg"
      />
      <span className="w-12 shrink-0 text-right font-mono text-xs text-muted">{value}</span>
    </div>
  );
}

// ─── component ───────────────────────────────────────────────────────────────

export default function OgpBgGenerator() {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [colors, setColors] = useState<ExtractedColor[] | null>(null);
  const [params, setParams] = useState<GenerationParams>(DEFAULT_PARAMS);

  const resultCanvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processImage = useCallback((file: File) => {
    setIsProcessing(true);
    setColors(null);
    setSourceUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setImgSize(null);

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const pixels = extractPixels(img);
      const extracted = kMeans(pixels, NUM_CLUSTERS, 20);
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      setSourceUrl(url);
      setColors(extracted);
      setIsProcessing(false);
    };
    img.onerror = () => { URL.revokeObjectURL(url); setIsProcessing(false); };
    img.src = url;
  }, []);

  // Re-generate when colors or params change
  useEffect(() => {
    if (!colors) return;
    const resultCanvas = resultCanvasRef.current;
    if (resultCanvas) generateOgpBackground(colors, resultCanvas, params);
  }, [colors, params]);

  const updateParam = useCallback(<K extends keyof GenerationParams>(key: K, value: GenerationParams[K]) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault(); setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) processImage(file);
    },
    [processImage],
  );
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback(() => setIsDragging(false), []);
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processImage(file);
      e.target.value = '';
    },
    [processImage],
  );

  const handleDownload = useCallback(() => {
    const canvas = resultCanvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'ogp-bg.png'; a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }, []);

  return (
    <main className="py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">OGP Background Generator</h1>
        <p className="mt-1 text-sm text-muted">
          Extract colors from an image and generate a 1200x630 OGP background.
        </p>
      </div>

      {/* Privacy notice */}
      <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-[color-mix(in_srgb,var(--color-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--color-fg)_3%,transparent)] px-4 py-3">
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        <p className="text-xs text-muted">
          <span className="font-medium text-fg">Privacy:</span> Runs entirely in your browser. No images are uploaded to any server.
        </p>
      </div>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Drop an image or click to select"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={[
          'mb-8 flex h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors select-none',
          isDragging
            ? 'border-[color-mix(in_srgb,var(--color-fg)_50%,transparent)] bg-[color-mix(in_srgb,var(--color-fg)_6%,transparent)]'
            : 'border-[color-mix(in_srgb,var(--color-fg)_18%,transparent)] bg-[color-mix(in_srgb,var(--color-fg)_2%,transparent)] hover:border-[color-mix(in_srgb,var(--color-fg)_35%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-fg)_4%,transparent)]',
        ].join(' ')}
      >
        <svg className="h-8 w-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
        </svg>
        <p className="text-sm text-muted">
          Drop an image here, or <span className="text-fg underline underline-offset-2">click to select</span>
        </p>
        <p className="font-mono text-xs text-muted opacity-60">PNG, JPEG, WebP, etc.</p>
        <input ref={inputRef} type="file" accept="image/*" className="sr-only" onChange={handleChange} />
      </div>

      {/* Processing */}
      {isProcessing && (
        <div className="flex items-center gap-3 text-sm text-muted">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[color-mix(in_srgb,var(--color-fg)_20%,transparent)] border-t-muted" />
          Extracting colors…
        </div>
      )}

      {/* Results */}
      {colors && sourceUrl && imgSize && !isProcessing && (
        <div className="space-y-8">
          {/* Source image */}
          <div>
            <h2 className="mb-2 font-mono text-xs font-medium uppercase tracking-widest text-muted">Source Image</h2>
            <div className="relative overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--color-fg)_12%,transparent)] shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sourceUrl} alt="Source" className="block w-full" />
              {colors.map((c, i) => (
                <span
                  key={i}
                  className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.25),0_2px_4px_rgba(0,0,0,0.3)]"
                  style={{
                    left: `${(c.x / imgSize.w) * 100}%`,
                    top: `${(c.y / imgSize.h) * 100}%`,
                    backgroundColor: `rgb(${c.color[0]},${c.color[1]},${c.color[2]})`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Extracted colors */}
          <div>
            <h2 className="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-muted">Extracted Colors</h2>
            <div className="flex flex-wrap gap-3">
              {colors.map((c, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div
                    className="h-12 w-12 rounded-full border-2 border-[color-mix(in_srgb,var(--color-fg)_15%,transparent)] shadow-sm"
                    style={{ backgroundColor: `rgb(${c.color[0]},${c.color[1]},${c.color[2]})` }}
                  />
                  <span className="font-mono text-[10px] text-muted">
                    {c.color.map((v) => v.toString(16).padStart(2, '0')).join('')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Adjustments */}
          <div>
            <h2 className="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-muted">Adjustments</h2>
            <div className="space-y-3 rounded-xl border border-[color-mix(in_srgb,var(--color-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--color-fg)_3%,transparent)] px-4 py-4">
              <ParamSlider label="Lightness" value={params.lightness} min={0.6} max={0.95} step={0.01} onChange={(v) => updateParam('lightness', v)} />
              <ParamSlider label="Chroma" value={params.chroma} min={0.5} max={4.0} step={0.05} onChange={(v) => updateParam('chroma', v)} />
              <ParamSlider label="Intensity" value={params.intensity} min={0.3} max={0.9} step={0.05} onChange={(v) => updateParam('intensity', v)} />
              <ParamSlider label="Blob Size" value={params.blobSize} min={0.5} max={2.0} step={0.1} onChange={(v) => updateParam('blobSize', v)} />
              <ParamSlider label="Blur" value={params.blur} min={0} max={80} step={1} onChange={(v) => updateParam('blur', v)} />
              <button
                type="button"
                onClick={() => setParams(DEFAULT_PARAMS)}
                className="font-mono text-xs text-muted underline underline-offset-2 transition-colors hover:text-fg"
              >
                Reset to defaults
              </button>
            </div>
          </div>

          {/* Preview */}
          <div>
            <h2 className="mb-2 font-mono text-xs font-medium uppercase tracking-widest text-muted">
              Preview <span className="opacity-50">({OGP_W} x {OGP_H})</span>
            </h2>
            <div className="overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--color-fg)_12%,transparent)] shadow-sm">
              <canvas
                ref={resultCanvasRef}
                className="w-full"
                style={{ aspectRatio: `${OGP_W}/${OGP_H}`, display: 'block' }}
              />
            </div>
          </div>

          {/* Download */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleDownload}
              className="rounded-lg bg-fg px-6 py-2.5 font-mono text-sm font-medium text-bg shadow-sm transition-colors hover:opacity-80"
            >
              Download PNG
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
