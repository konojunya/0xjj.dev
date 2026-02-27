import { createOgImage, OG_SIZE } from '../lib/og';

export const alt = 'UUID Generator';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return createOgImage('UUID Generator', 'Generate v4 UUIDs instantly, in bulk.');
}
