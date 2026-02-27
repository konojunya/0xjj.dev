import type { SatoriOptions } from 'satori';
import satori from 'satori';
import { Resvg, initWasm } from '@resvg/resvg-wasm';
// @ts-expect-error — wasm module import handled by Vite/Cloudflare
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm?module';

export const OG_SIZE = { width: 1200, height: 630 };

let wasmReady: Promise<void> | null = null;
function ensureWasm() {
  if (!wasmReady) {
    wasmReady = initWasm(resvgWasm).catch((e: Error) => {
      if (!e.message?.includes('Already initialized')) throw e;
    });
  }
  return wasmReady;
}

let fontData: ArrayBuffer | null = null;
async function loadFont(): Promise<ArrayBuffer> {
  if (fontData) return fontData;
  // Fetch Noto Sans from Google Fonts (same approach as @vercel/og)
  const css = await fetch(
    'https://fonts.googleapis.com/css2?family=Noto+Sans:wght@700&text=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789%20%26%2F%2B%2D.%2C!%3F%23%40%3A%3B%28%29%5B%5D',
    { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' } },
  ).then((r) => r.text());
  const url = css.match(/src:\s*url\(([^)]+)\)/)?.[1];
  if (!url) throw new Error('Failed to parse Google Fonts CSS');
  fontData = await fetch(url).then((r) => r.arrayBuffer());
  return fontData;
}

export async function createOgImage(title: string, description: string) {
  const [, font] = await Promise.all([ensureWasm(), loadFont()]);

  const fonts: SatoriOptions['fonts'] = [
    { name: 'sans-serif', data: font, weight: 700, style: 'normal' },
  ];

  const svg = await satori(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#fafafa',
        display: 'flex',
        flexDirection: 'column',
        padding: '72px 80px',
        fontFamily: 'sans-serif',
        position: 'relative',
      }}
    >
      {/* domain label */}
      <div
        style={{
          display: 'flex',
          fontSize: 22,
          color: '#a3a3a3',
          fontFamily: 'monospace',
          letterSpacing: '0.04em',
          marginBottom: 'auto',
        }}
      >
        playground.0xjj.dev
      </div>

      {/* title + description */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div
          style={{
            fontSize: 80,
            fontWeight: 700,
            color: '#0f0f0f',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 30,
            color: '#525252',
            lineHeight: 1.5,
            maxWidth: 900,
          }}
        >
          {description}
        </div>
      </div>
    </div>,
    { width: OG_SIZE.width, height: OG_SIZE.height, fonts },
  );

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: OG_SIZE.width },
  });
  const png = resvg.render().asPng();

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
