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

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sn = s / 100, ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = ln - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60)       { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else              { r = c; b = x; }

  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function hwbToRgb(h: number, w: number, bk: number): [number, number, number] {
  const wn = w / 100, bkn = bk / 100;
  if (wn + bkn >= 1) {
    const gray = (wn / (wn + bkn)) * 255;
    return [gray, gray, gray];
  }
  const [r, g, b] = hslToRgb(h, 100, 50);
  const f = 1 - wn - bkn;
  return [
    (r / 255) * f * 255 + wn * 255,
    (g / 255) * f * 255 + wn * 255,
    (b / 255) * f * 255 + wn * 255,
  ];
}

function labToXyz(L: number, a: number, b: number): [number, number, number] {
  const Xn = 0.95047, Yn = 1.00000, Zn = 1.08883;
  const fy = (L + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;

  function invF(t: number) {
    return t > 0.206897 ? t * t * t : (t - 16 / 116) / 7.787;
  }

  return [invF(fx) * Xn, invF(fy) * Yn, invF(fz) * Zn];
}

function xyzToRgb(x: number, y: number, z: number): [number, number, number] {
  const rl =  3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
  const gl = -0.9692660 * x + 1.8760108 * y + 0.0415560 * z;
  const bl =  0.0556434 * x - 0.2040259 * y + 1.0572252 * z;

  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  return [
    gammaEncode(clamp01(rl)) * 255,
    gammaEncode(clamp01(gl)) * 255,
    gammaEncode(clamp01(bl)) * 255,
  ];
}

function oklabToRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const rl =  4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gl = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  return [
    gammaEncode(clamp01(rl)) * 255,
    gammaEncode(clamp01(gl)) * 255,
    gammaEncode(clamp01(bl)) * 255,
  ];
}

function p3ToXyz(r: number, g: number, b: number): [number, number, number] {
  const rl = linearize(r);
  const gl = linearize(g);
  const bl = linearize(b);

  return [
    0.4865709 * rl + 0.2656677 * gl + 0.1982173 * bl,
    0.2289746 * rl + 0.6917385 * gl + 0.0792869 * bl,
    0.0000000 * rl + 0.0451134 * gl + 1.0439444 * bl,
  ];
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

// ─── parse helpers ────────────────────────────────────────────────────────────

function parseNum(s: string): number | null {
  s = s.trim();
  if (s.endsWith('%')) {
    const v = parseFloat(s);
    if (isNaN(v)) return null;
    return (v / 100) * 255;
  }
  const v = parseFloat(s);
  return isNaN(v) ? null : v;
}

function parsePct(s: string): number | null {
  s = s.trim();
  const v = parseFloat(s);
  return isNaN(v) ? null : v;
}

function parseAlphaVal(s: string): number {
  s = s.trim();
  let v: number;
  if (s.endsWith('%')) {
    v = parseFloat(s) / 100;
  } else {
    v = parseFloat(s);
  }
  if (isNaN(v)) return 1;
  return Math.max(0, Math.min(1, v));
}

function parseAngle(s: string): number {
  s = s.trim();
  if (s.endsWith('grad')) return parseFloat(s) * (360 / 400);
  if (s.endsWith('turn')) return parseFloat(s) * 360;
  if (s.endsWith('rad'))  return parseFloat(s) * (180 / Math.PI);
  if (s.endsWith('deg'))  return parseFloat(s);
  return parseFloat(s);
}

function splitArgs(inner: string): string[] {
  const normalized = inner.replace(/,/g, ' ');
  const tokens = normalized.trim().split(/\s+/).filter(Boolean);
  const slashIdx = tokens.findIndex((p) => p === '/');
  if (slashIdx === -1) return tokens;
  const channels = tokens.slice(0, slashIdx);
  const alphaToken = tokens.slice(slashIdx + 1).join('');
  return [...channels, '/' + alphaToken];
}

// ─── css parsers ──────────────────────────────────────────────────────────────

function parseRgb(input: string): Rgba | null {
  const m = input.trim().match(/^rgba?\s*\((.+)\)$/i);
  if (!m) return null;
  const parts = splitArgs(m[1]);
  if (parts.length < 3) return null;

  const r = parseNum(parts[0]);
  const g = parseNum(parts[1]);
  const b = parseNum(parts[2]);
  if (r === null || g === null || b === null) return null;

  let a = 1;
  const alphaToken = parts.find((p) => p.startsWith('/'));
  if (alphaToken) {
    a = parseAlphaVal(alphaToken.slice(1));
  } else if (parts.length >= 4) {
    a = parseAlphaVal(parts[3]);
  }

  return {
    r: Math.max(0, Math.min(255, r)),
    g: Math.max(0, Math.min(255, g)),
    b: Math.max(0, Math.min(255, b)),
    a,
  };
}

function parseHsl(input: string): Rgba | null {
  const m = input.trim().match(/^hsla?\s*\((.+)\)$/i);
  if (!m) return null;
  const parts = splitArgs(m[1]);
  if (parts.length < 3) return null;

  const h = ((parseAngle(parts[0]) % 360) + 360) % 360;
  const s = parsePct(parts[1]);
  const l = parsePct(parts[2]);
  if (s === null || l === null || isNaN(h)) return null;

  let a = 1;
  const alphaToken = parts.find((p) => p.startsWith('/'));
  if (alphaToken) {
    a = parseAlphaVal(alphaToken.slice(1));
  } else if (parts.length >= 4) {
    a = parseAlphaVal(parts[3]);
  }

  const [r, g, b] = hslToRgb(h, s, l);
  return {
    r: Math.max(0, Math.min(255, r)),
    g: Math.max(0, Math.min(255, g)),
    b: Math.max(0, Math.min(255, b)),
    a,
  };
}

function parseHwb(input: string): Rgba | null {
  const m = input.trim().match(/^hwb\s*\((.+)\)$/i);
  if (!m) return null;
  const parts = splitArgs(m[1]);
  if (parts.length < 3) return null;

  const h = ((parseAngle(parts[0]) % 360) + 360) % 360;
  const w = parsePct(parts[1]);
  const bk = parsePct(parts[2]);
  if (w === null || bk === null || isNaN(h)) return null;

  let a = 1;
  const alphaToken = parts.find((p) => p.startsWith('/'));
  if (alphaToken) a = parseAlphaVal(alphaToken.slice(1));

  const [r, g, b] = hwbToRgb(h, w, bk);
  return {
    r: Math.max(0, Math.min(255, r)),
    g: Math.max(0, Math.min(255, g)),
    b: Math.max(0, Math.min(255, b)),
    a,
  };
}

function parseLab(input: string): Rgba | null {
  const m = input.trim().match(/^lab\s*\((.+)\)$/i);
  if (!m) return null;
  const parts = splitArgs(m[1]);
  if (parts.length < 3) return null;

  const L = parseFloat(parts[0]);
  const a = parseFloat(parts[1]);
  const b = parseFloat(parts[2]);
  if (isNaN(L) || isNaN(a) || isNaN(b)) return null;

  let alpha = 1;
  const alphaToken = parts.find((p) => p.startsWith('/'));
  if (alphaToken) alpha = parseAlphaVal(alphaToken.slice(1));

  const [x, y, z] = labToXyz(L, a, b);
  const [r, g, bv] = xyzToRgb(x, y, z);
  return { r, g, b: bv, a: alpha };
}

function parseLch(input: string): Rgba | null {
  const m = input.trim().match(/^lch\s*\((.+)\)$/i);
  if (!m) return null;
  const parts = splitArgs(m[1]);
  if (parts.length < 3) return null;

  const L = parseFloat(parts[0]);
  const C = parseFloat(parts[1]);
  const H = parseAngle(parts[2]);
  if (isNaN(L) || isNaN(C) || isNaN(H)) return null;

  let alpha = 1;
  const alphaToken = parts.find((p) => p.startsWith('/'));
  if (alphaToken) alpha = parseAlphaVal(alphaToken.slice(1));

  const labA = C * Math.cos(H * (Math.PI / 180));
  const labB = C * Math.sin(H * (Math.PI / 180));
  const [x, y, z] = labToXyz(L, labA, labB);
  const [r, g, b] = xyzToRgb(x, y, z);
  return { r, g, b, a: alpha };
}

function parseOklab(input: string): Rgba | null {
  const m = input.trim().match(/^oklab\s*\((.+)\)$/i);
  if (!m) return null;
  const parts = splitArgs(m[1]);
  if (parts.length < 3) return null;

  const L = parseFloat(parts[0]);
  const a = parseFloat(parts[1]);
  const b = parseFloat(parts[2]);
  if (isNaN(L) || isNaN(a) || isNaN(b)) return null;

  let alpha = 1;
  const alphaToken = parts.find((p) => p.startsWith('/'));
  if (alphaToken) alpha = parseAlphaVal(alphaToken.slice(1));

  const [r, g, bv] = oklabToRgb(L, a, b);
  return { r, g, b: bv, a: alpha };
}

function parseOklch(input: string): Rgba | null {
  const m = input.trim().match(/^oklch\s*\((.+)\)$/i);
  if (!m) return null;
  const parts = splitArgs(m[1]);
  if (parts.length < 3) return null;

  const L = parseFloat(parts[0]);
  const C = parseFloat(parts[1]);
  const H = parseAngle(parts[2]);
  if (isNaN(L) || isNaN(C) || isNaN(H)) return null;

  let alpha = 1;
  const alphaToken = parts.find((p) => p.startsWith('/'));
  if (alphaToken) alpha = parseAlphaVal(alphaToken.slice(1));

  const oklabA = C * Math.cos(H * (Math.PI / 180));
  const oklabB = C * Math.sin(H * (Math.PI / 180));
  const [r, g, b] = oklabToRgb(L, oklabA, oklabB);
  return { r, g, b, a: alpha };
}

function parseColorFn(input: string): Rgba | null {
  const m = input.trim().match(/^color\s*\(\s*([\w-]+)\s+(.+)\)$/i);
  if (!m) return null;
  const space = m[1].toLowerCase();
  const parts = splitArgs(m[2]);
  if (parts.length < 3) return null;

  const c0 = parseFloat(parts[0]);
  const c1 = parseFloat(parts[1]);
  const c2 = parseFloat(parts[2]);
  if (isNaN(c0) || isNaN(c1) || isNaN(c2)) return null;

  let alpha = 1;
  const alphaToken = parts.find((p) => p.startsWith('/'));
  if (alphaToken) alpha = parseAlphaVal(alphaToken.slice(1));

  if (space === 'srgb') {
    return {
      r: Math.max(0, Math.min(255, c0 * 255)),
      g: Math.max(0, Math.min(255, c1 * 255)),
      b: Math.max(0, Math.min(255, c2 * 255)),
      a: alpha,
    };
  }

  if (space === 'display-p3') {
    const [x, y, z] = p3ToXyz(c0, c1, c2);
    const [r, g, b] = xyzToRgb(x, y, z);
    return { r, g, b, a: alpha };
  }

  return null;
}

function parseColor(input: string): Rgba | null {
  return parseHex(input) ?? parseRgb(input) ?? parseHsl(input) ?? parseHwb(input)
    ?? parseLab(input) ?? parseLch(input) ?? parseOklab(input) ?? parseOklch(input)
    ?? parseColorFn(input) ?? null;
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
  const [colorInput, setColorInput] = useState('#ff8000');
  const lastValidPickerRef = useRef('#ff8000');

  const parsed = useMemo(() => parseColor(colorInput), [colorInput]);

  useEffect(() => {
    if (parsed) {
      lastValidPickerRef.current = `#${toHex2(parsed.r)}${toHex2(parsed.g)}${toHex2(parsed.b)}`;
    }
  }, [parsed]);

  const colors = useMemo(() => (parsed ? computeColors(parsed) : null), [parsed]);

  const swatchBg = parsed
    ? `rgba(${Math.round(parsed.r)}, ${Math.round(parsed.g)}, ${Math.round(parsed.b)}, ${parsed.a})`
    : undefined;

  const isInvalid = colorInput !== '' && !parsed;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      {/* header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Color Converter</h1>
        <p className="mt-1 text-sm text-muted">Convert any CSS color format — HEX, RGB, HSL, OKLAB, OKLCH, and more.</p>
      </div>

      {/* input row */}
      <div className="mb-6 flex items-center gap-3">
        <input
          type="color"
          value={lastValidPickerRef.current}
          onChange={(e) => setColorInput(e.target.value)}
          className="h-10 w-10 cursor-pointer rounded-lg border border-[color-mix(in_srgb,var(--color-fg)_15%,transparent)] bg-transparent p-0.5"
          title="Pick a color"
        />
        <input
          type="text"
          value={colorInput}
          onChange={(e) => setColorInput(e.target.value)}
          placeholder="#ff8000"
          spellCheck={false}
          className={`flex-1 rounded-lg border bg-transparent px-3 py-2 font-mono text-base text-fg outline-none transition-colors placeholder:text-muted focus:border-[color-mix(in_srgb,var(--color-fg)_40%,transparent)] ${
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
          Unrecognized color format.
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
