'use client';

import { useState, useMemo, useEffect, useRef } from 'react';

// ─── types ────────────────────────────────────────────────────────────────────

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

// ─── hex parsing ──────────────────────────────────────────────────────────────

function parseHex(input: string): Rgba | null {
  const h = input.trim().replace(/^#/, '');
  let r: number, g: number, b: number, a = 1;

  if (h.length === 3) {
    r = parseInt(h[0] + h[0], 16);
    g = parseInt(h[1] + h[1], 16);
    b = parseInt(h[2] + h[2], 16);
  } else if (h.length === 4) {
    r = parseInt(h[0] + h[0], 16);
    g = parseInt(h[1] + h[1], 16);
    b = parseInt(h[2] + h[2], 16);
    a = parseInt(h[3] + h[3], 16) / 255;
  } else if (h.length === 6) {
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  } else if (h.length === 8) {
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
    a = parseInt(h.slice(6, 8), 16) / 255;
  } else {
    return null;
  }

  if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) return null;
  return { r, g, b, a };
}

// ─── math ─────────────────────────────────────────────────────────────────────

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, l * 100];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;

  return [h * 60, s * 100, l * 100];
}

function rgbToHwb(r: number, g: number, b: number): [number, number, number] {
  const [h] = rgbToHsl(r, g, b);
  const w = (Math.min(r, g, b) / 255) * 100;
  const bk = (1 - Math.max(r, g, b) / 255) * 100;
  return [h, w, bk];
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;

  const v = max * 100;
  const s = max === 0 ? 0 : (d / max) * 100;

  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
    else if (max === gn) h = ((bn - rn) / d + 2) * 60;
    else h = ((rn - gn) / d + 4) * 60;
  }

  return [h, s, v];
}

function rgbToCmyk(r: number, g: number, b: number): [number, number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);

  if (k === 1) return [0, 0, 0, 100];

  const c = ((1 - rn - k) / (1 - k)) * 100;
  const m = ((1 - gn - k) / (1 - k)) * 100;
  const y = ((1 - bn - k) / (1 - k)) * 100;

  return [c, m, y, k * 100];
}

function linearize(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function gammaEncode(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function rgbToXyz(r: number, g: number, b: number): [number, number, number] {
  const rl = linearize(r / 255);
  const gl = linearize(g / 255);
  const bl = linearize(b / 255);

  return [
    0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl,
    0.2126729 * rl + 0.7151522 * gl + 0.0721750 * bl,
    0.0193339 * rl + 0.1191920 * gl + 0.9503041 * bl,
  ];
}

function xyzToLab(x: number, y: number, z: number): [number, number, number] {
  const Xn = 0.95047, Yn = 1.00000, Zn = 1.08883;

  function f(t: number) {
    return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  }

  const fx = f(x / Xn);
  const fy = f(y / Yn);
  const fz = f(z / Zn);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function labToLch(L: number, a: number, b: number): [number, number, number] {
  const C = Math.sqrt(a * a + b * b);
  let H = Math.atan2(b, a) * (180 / Math.PI);
  if (H < 0) H += 360;
  return [L, C, H];
}

function rgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const rl = linearize(r / 255);
  const gl = linearize(g / 255);
  const bl = linearize(b / 255);

  const l = Math.cbrt(0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl);
  const m = Math.cbrt(0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl);
  const s = Math.cbrt(0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl);

  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

function oklabToOklch(L: number, a: number, b: number): [number, number, number] {
  const C = Math.sqrt(a * a + b * b);
  let H = Math.atan2(b, a) * (180 / Math.PI);
  if (H < 0) H += 360;
  return [L, C, H];
}

function xyzToDisplayP3(x: number, y: number, z: number): [number, number, number] {
  const rL = 2.4934969 * x - 0.9313836 * y - 0.4027108 * z;
  const gL = -0.8294890 * x + 1.7626641 * y + 0.0236247 * z;
  const bL = 0.0358458 * x - 0.0761724 * y + 0.9568845 * z;
  return [gammaEncode(rL), gammaEncode(gL), gammaEncode(bL)];
}

// ─── format helpers ───────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2): string {
  return parseFloat(n.toFixed(decimals)).toString();
}

function toHex2(n: number): string {
  return Math.round(n).toString(16).padStart(2, '0');
}

// ─── compute all color values ─────────────────────────────────────────────────

interface ColorValues {
  hex: string;
  hexAlpha: string;
  rgb: string;
  rgba: string;
  hsl: string;
  hsla: string;
  rgbModern: string;
  hslModern: string;
  hwb: string;
  lab: string;
  lch: string;
  oklab: string;
  oklch: string;
  colorSrgb: string;
  colorDisplayP3: string;
  hsv: string;
  cmyk: string;
}

function computeColors({ r, g, b, a }: Rgba): ColorValues {
  const aFmt = fmt(a);
  const hexStr = `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
  const hexAlphaStr = `${hexStr}${toHex2(a * 255)}`;

  const rInt = Math.round(r), gInt = Math.round(g), bInt = Math.round(b);

  const [h, s, l] = rgbToHsl(r, g, b);
  const [hwbH, hwbW, hwbBk] = rgbToHwb(r, g, b);
  const [xyz_x, xyz_y, xyz_z] = rgbToXyz(r, g, b);
  const [labL, labA, labB] = xyzToLab(xyz_x, xyz_y, xyz_z);
  const [lchL, lchC, lchH] = labToLch(labL, labA, labB);
  const [okL, okA, okB] = rgbToOklab(r, g, b);
  const [oklchL, oklchC, oklchH] = oklabToOklch(okL, okA, okB);
  const [p3R, p3G, p3B] = xyzToDisplayP3(xyz_x, xyz_y, xyz_z);
  const [hsvH, hsvS, hsvV] = rgbToHsv(r, g, b);
  const [cC, cM, cY, cK] = rgbToCmyk(r, g, b);

  return {
    hex: hexStr,
    hexAlpha: hexAlphaStr,
    rgb: `rgb(${rInt}, ${gInt}, ${bInt})`,
    rgba: `rgba(${rInt}, ${gInt}, ${bInt}, ${aFmt})`,
    hsl: `hsl(${fmt(h)}, ${fmt(s)}%, ${fmt(l)}%)`,
    hsla: `hsla(${fmt(h)}, ${fmt(s)}%, ${fmt(l)}%, ${aFmt})`,
    rgbModern: `rgb(${rInt} ${gInt} ${bInt})`,
    hslModern: `hsl(${fmt(h)} ${fmt(s)}% ${fmt(l)}%)`,
    hwb: `hwb(${fmt(hwbH)} ${fmt(hwbW)}% ${fmt(hwbBk)}%)`,
    lab: `lab(${fmt(labL)} ${fmt(labA)} ${fmt(labB)})`,
    lch: `lch(${fmt(lchL)} ${fmt(lchC)} ${fmt(lchH)})`,
    oklab: `oklab(${fmt(okL, 4)} ${fmt(okA, 4)} ${fmt(okB, 4)})`,
    oklch: `oklch(${fmt(oklchL, 4)} ${fmt(oklchC, 4)} ${fmt(oklchH, 2)})`,
    colorSrgb: `color(srgb ${fmt(r / 255, 4)} ${fmt(g / 255, 4)} ${fmt(b / 255, 4)})`,
    colorDisplayP3: `color(display-p3 ${fmt(p3R, 4)} ${fmt(p3G, 4)} ${fmt(p3B, 4)})`,
    hsv: `hsv(${fmt(hsvH)}°, ${fmt(hsvS)}%, ${fmt(hsvV)}%)`,
    cmyk: `cmyk(${fmt(cC)}, ${fmt(cM)}, ${fmt(cY)}, ${fmt(cK)})`,
  };
}

// ─── copy button ──────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <button
      onClick={copy}
      className={`shrink-0 rounded px-2 py-1 font-mono text-xs transition-colors ${
        copied
          ? 'bg-[color-mix(in_srgb,var(--color-accent)_15%,transparent)] text-accent'
          : 'text-muted hover:text-fg'
      }`}
    >
      {copied ? '✓ copied' : 'copy'}
    </button>
  );
}

// ─── format row ───────────────────────────────────────────────────────────────

function FormatRow({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-[color-mix(in_srgb,var(--color-fg)_6%,transparent)] py-2 last:border-b-0">
      <span className="w-36 shrink-0 font-mono text-xs text-muted">{name}</span>
      <code className="min-w-0 flex-1 truncate font-mono text-sm text-fg">{value}</code>
      <CopyButton value={value} />
    </div>
  );
}

// ─── section divider ──────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="mb-3 mt-8 flex items-center gap-3 first:mt-0">
      <span className="whitespace-nowrap font-mono text-xs uppercase tracking-widest text-muted">
        {label}
      </span>
      <div className="h-px flex-1 bg-[color-mix(in_srgb,var(--color-fg)_12%,transparent)]" />
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function ColorConverter() {
  const [hexInput, setHexInput] = useState('#ff8000');
  const lastValidPickerRef = useRef('#ff8000');

  const parsed = useMemo(() => parseHex(hexInput), [hexInput]);

  useEffect(() => {
    if (parsed) {
      lastValidPickerRef.current = `#${toHex2(parsed.r)}${toHex2(parsed.g)}${toHex2(parsed.b)}`;
    }
  }, [parsed]);

  const colors = useMemo(() => (parsed ? computeColors(parsed) : null), [parsed]);

  const swatchBg = parsed
    ? `rgba(${Math.round(parsed.r)}, ${Math.round(parsed.g)}, ${Math.round(parsed.b)}, ${parsed.a})`
    : undefined;

  const isInvalid = hexInput !== '' && !parsed;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      {/* header */}
      <div className="mb-8">
        <a
          href="/"
          className="mb-6 inline-block font-mono text-xs text-muted transition-colors hover:text-fg"
        >
          ← back
        </a>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Color Converter</h1>
        <p className="mt-1 text-sm text-muted">Convert hex colors to all CSS color formats.</p>
      </div>

      {/* input row */}
      <div className="mb-6 flex items-center gap-3">
        <input
          type="color"
          value={lastValidPickerRef.current}
          onChange={(e) => setHexInput(e.target.value)}
          className="h-10 w-10 cursor-pointer rounded-lg border border-[color-mix(in_srgb,var(--color-fg)_15%,transparent)] bg-transparent p-0.5"
          title="Pick a color"
        />
        <input
          type="text"
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value)}
          placeholder="#ff8000"
          spellCheck={false}
          className={`w-44 rounded-lg border bg-transparent px-3 py-2 font-mono text-sm text-fg outline-none transition-colors placeholder:text-muted focus:border-[color-mix(in_srgb,var(--color-fg)_40%,transparent)] ${
            isInvalid
              ? 'border-red-500'
              : 'border-[color-mix(in_srgb,var(--color-fg)_15%,transparent)]'
          }`}
        />
      </div>

      {/* swatch */}
      <div
        className="mb-8 h-24 rounded-xl border border-[color-mix(in_srgb,var(--color-fg)_12%,transparent)] transition-colors"
        style={swatchBg ? { backgroundColor: swatchBg } : { backgroundColor: 'transparent' }}
      />

      {/* error */}
      {isInvalid && (
        <p className="mb-6 font-mono text-xs text-red-500">
          Invalid hex color. Expected: #rgb, #rrggbb, #rgba, or #rrggbbaa.
        </p>
      )}

      {/* color tables */}
      {colors && (
        <>
          <SectionDivider label="CSS Legacy" />
          <FormatRow name="HEX" value={colors.hex} />
          <FormatRow name="HEX (alpha)" value={colors.hexAlpha} />
          <FormatRow name="RGB" value={colors.rgb} />
          <FormatRow name="RGBA" value={colors.rgba} />
          <FormatRow name="HSL" value={colors.hsl} />
          <FormatRow name="HSLA" value={colors.hsla} />

          <SectionDivider label="CSS Color Level 4" />
          <FormatRow name="RGB" value={colors.rgbModern} />
          <FormatRow name="HSL" value={colors.hslModern} />
          <FormatRow name="HWB" value={colors.hwb} />
          <FormatRow name="LAB" value={colors.lab} />
          <FormatRow name="LCH" value={colors.lch} />
          <FormatRow name="OKLAB" value={colors.oklab} />
          <FormatRow name="OKLCH" value={colors.oklch} />
          <FormatRow name="color(srgb)" value={colors.colorSrgb} />
          <FormatRow name="color(display-p3)" value={colors.colorDisplayP3} />

          <SectionDivider label="Design / Other" />
          <FormatRow name="HSV / HSB" value={colors.hsv} />
          <FormatRow name="CMYK" value={colors.cmyk} />
        </>
      )}
    </main>
  );
}
