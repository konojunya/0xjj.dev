import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'Time Calculator';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage(
    'Time Calculator',
    'Add or subtract HH:MM:SS durations and compute totals.',
  );
}
