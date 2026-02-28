import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'JSON to TypeScript';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage(
    'JSON to TypeScript',
    'Generate TypeScript interfaces from JSON — handles nested objects and arrays.',
  );
}
