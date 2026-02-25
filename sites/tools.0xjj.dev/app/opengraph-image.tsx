import { createOgImage, OG_SIZE } from './lib/og';

export const alt = 'tools.0xjj.dev';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return createOgImage('tools.0xjj.dev', 'Useful tools for everyone.');
}
