import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { Resvg, initWasm } from '@resvg/resvg-wasm';
import satori from 'satori';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Font buffers — satori converts text to SVG paths so resvg needs no font lookup
const interRegular = readFileSync(
  resolve('node_modules/@fontsource/inter/files/inter-latin-400-normal.woff')
);
const interBold = readFileSync(
  resolve('node_modules/@fontsource/inter/files/inter-latin-700-normal.woff')
);
const notoRegular = readFileSync(
  resolve('node_modules/@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-400-normal.woff')
);
const notoBold = readFileSync(
  resolve('node_modules/@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-700-normal.woff')
);

const fonts = [
  { name: 'Inter',        data: interRegular, weight: 400 as const, style: 'normal' as const },
  { name: 'Inter',        data: interBold,    weight: 700 as const, style: 'normal' as const },
  { name: 'Noto Sans JP', data: notoRegular,  weight: 400 as const, style: 'normal' as const },
  { name: 'Noto Sans JP', data: notoBold,     weight: 700 as const, style: 'normal' as const },
];

let wasmInitPromise: Promise<void> | null = null;
async function ensureWasm() {
  if (!wasmInitPromise) {
    wasmInitPromise = (async () => {
      const wasmBuffer = readFileSync(
        resolve('node_modules/@resvg/resvg-wasm/index_bg.wasm')
      );
      try {
        await initWasm(wasmBuffer);
      } catch (e: any) {
        if (!e?.message?.includes('Already initialized')) throw e;
      }
    })();
  }
  return wasmInitPromise;
}

const W = 1200, H = 630;
const INK = '#1e0e4e';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map(post => ({ params: { slug: post.id }, props: { post } }));
}

export const GET: APIRoute = async ({ props }) => {
  await ensureWasm();
  const { post } = props as any;
  const title: string = post.data.title;
  const dateStr = post.data.date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const len = title.length;
  const fs = len > 45 ? 42 : len > 24 ? 52 : 64;

  // Read pre-generated pastel background (produced by: bun run generate-ogp)
  const bgPath = resolve(`public/og/bg/${post.id}.png`);
  const bgDataUri = `data:image/png;base64,${readFileSync(bgPath).toString('base64')}`;

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          width: W,
          height: H,
          position: 'relative',
        },
        children: [
          // Background layer
          {
            type: 'img',
            props: {
              src: bgDataUri,
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                width: W,
                height: H,
              },
            },
          },
          // Content: title + footer
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                width: W,
                height: H,
                padding: '48px 72px 28px',
                position: 'relative',
              },
              children: [
                // Title — fills the available space and centers vertically
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                    children: [{
                      type: 'span',
                      props: {
                        style: {
                          fontFamily: 'Inter, Noto Sans JP',
                          fontSize: fs,
                          fontWeight: 700,
                          color: INK,
                          textAlign: 'center',
                          lineHeight: 1.25,
                          letterSpacing: `${(-fs * 0.025).toFixed(1)}px`,
                          maxWidth: W - 144,
                        },
                        children: title,
                      },
                    }],
                  },
                },
                // Footer
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end',
                      borderTop: `1px solid rgba(30,14,78,0.15)`,
                      paddingTop: 12,
                    },
                    children: [
                      {
                        type: 'span',
                        props: {
                          style: {
                            fontFamily: 'Inter',
                            fontSize: 13,
                            fontWeight: 400,
                            color: `rgba(30,14,78,0.45)`,
                            letterSpacing: '0.5px',
                          },
                          children: '0xjj.dev',
                        },
                      },
                      {
                        type: 'span',
                        props: {
                          style: {
                            fontFamily: 'Inter',
                            fontSize: 13,
                            fontWeight: 400,
                            color: `rgba(30,14,78,0.55)`,
                            letterSpacing: '0.5px',
                          },
                          children: dateStr,
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    { width: W, height: H, fonts }
  );

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: W } });
  const png = resvg.render().asPng();

  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
