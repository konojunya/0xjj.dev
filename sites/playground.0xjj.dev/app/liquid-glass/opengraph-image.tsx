import { createOgImage, OG_SIZE } from '../lib/og';

export const alt = 'Liquid Glass';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage('Liquid Glass', 'Apple-inspired Liquid Glass effect using SVG filters and backdrop-filter.');
}
