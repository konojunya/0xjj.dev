import { createOgImage, OG_SIZE } from '../lib/og';

export const alt = 'OGP Checker';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return createOgImage('OGP Checker', 'Inspect Open Graph, Twitter Card, and all meta tags for any URL.');
}
