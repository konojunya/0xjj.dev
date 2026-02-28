import { createOgImage, OG_SIZE } from '../lib/og';

export const alt = 'HTTP Status Codes';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage(
    'HTTP Status Codes',
    'Browse and search HTTP status codes with descriptions by category.',
  );
}
