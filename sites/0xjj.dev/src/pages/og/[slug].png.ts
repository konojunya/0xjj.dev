import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import satori from 'satori';
import { Resvg, initWasm } from '@resvg/resvg-wasm';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const interRegular = readFileSync(
  resolve('node_modules/@fontsource/inter/files/inter-latin-400-normal.woff')
);
const interBold = readFileSync(
  resolve('node_modules/@fontsource/inter/files/inter-latin-700-normal.woff')
);

let wasmInitialized = false;
async function ensureWasm() {
  if (wasmInitialized) return;
  const wasmBuffer = readFileSync(
    resolve('node_modules/@resvg/resvg-wasm/index_bg.wasm')
  );
  await initWasm(wasmBuffer);
  wasmInitialized = true;
}

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map(post => ({ params: { slug: post.id }, props: { post } }));
}

export const GET: APIRoute = async ({ props }) => {
  await ensureWasm();
  const { post } = props as any;
  const title: string = post.data.title;

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          backgroundColor: '#0e0d0c',
          fontFamily: 'Inter',
        },
        children: [
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column', gap: '28px' },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { fontSize: '15px', color: '#7a7570', letterSpacing: '0.1em' },
                    children: '0xjj.dev',
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: title.length > 40 ? '38px' : '52px',
                      fontWeight: 700,
                      color: '#f0ece5',
                      lineHeight: 1.25,
                      maxWidth: '900px',
                    },
                    children: title,
                  },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: { fontSize: '14px', color: '#BC7AFF', letterSpacing: '0.06em' },
              children: post.data.date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }),
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Inter', data: interRegular, weight: 400, style: 'normal' },
        { name: 'Inter', data: interBold, weight: 700, style: 'normal' },
      ],
    }
  );

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
  const png = resvg.render().asPng();

  return new Response(png, {
    headers: { 'Content-Type': 'image/png' },
  });
};
