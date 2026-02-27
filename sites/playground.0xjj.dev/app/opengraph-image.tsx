import { createOgImage, OG_SIZE } from './lib/og';

export const alt = 'playground.0xjj.dev';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage('playground.0xjj.dev', 'Tools, games & experiments.');
}
