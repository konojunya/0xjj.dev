import { createOgImage, OG_SIZE } from '../lib/og';

export const alt = 'Unicode Character Search';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage(
    'Unicode Character Search',
    'Search Unicode characters by name or code point and copy to clipboard.',
  );
}
