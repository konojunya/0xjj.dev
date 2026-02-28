import { createOgImage, OG_SIZE } from '../lib/og';

export const alt = 'Ratio Calculator';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage('Ratio Calculator', 'Simplify ratios and calculate missing values from a known ratio.');
}
