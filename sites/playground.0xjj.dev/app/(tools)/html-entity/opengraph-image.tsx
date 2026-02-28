import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'HTML Entity Encoder / Decoder';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage(
    'HTML Entity Encoder / Decoder',
    'Encode special characters to HTML entities or decode them back.',
  );
}
