import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'Base64 Encoder / Decoder';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage('Base64 Encoder / Decoder', 'Encode text to Base64 or decode Base64 back to text.');
}
