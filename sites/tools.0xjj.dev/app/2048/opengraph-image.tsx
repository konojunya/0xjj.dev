import { createOgImage, OG_SIZE } from '../lib/og';

export const alt = '2048';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return createOgImage('2048', 'Slide and merge tiles to reach 2048. A classic single-player puzzle game.');
}
