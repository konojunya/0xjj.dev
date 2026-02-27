import { createOgImage, OG_SIZE } from '../lib/og';

export const alt = 'Hash Calculator';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage('Hash Calculator', 'Compute SHA-1, SHA-256, SHA-384, and SHA-512 hashes of any text.');
}
