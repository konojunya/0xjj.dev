import { createOgImage, OG_SIZE } from '../lib/og';

export const alt = 'Dots & Boxes';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage('Dots & Boxes', 'Draw lines to complete boxes and outscore your opponent.');
}
