import { createOgImage, OG_SIZE } from '../lib/og';

export const alt = 'Color Converter';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return createOgImage('Color Converter', 'Convert hex colors to all CSS color formats.');
}
