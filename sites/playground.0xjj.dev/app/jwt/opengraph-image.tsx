import { createOgImage, OG_SIZE } from '../lib/og';

export const alt = 'JWT Decoder';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return createOgImage('JWT Decoder', 'Decode and inspect JWT header, payload, and expiry.');
}
