import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'Color Converter';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage('Color Converter', 'Convert any CSS color format — HEX, RGB, HSL, OKLAB, OKLCH, and more.');
}
