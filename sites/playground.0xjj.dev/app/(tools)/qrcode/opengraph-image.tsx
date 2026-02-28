import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'QR Code Generator';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage(
    'QR Code Generator',
    'Generate QR codes from any text or URL and download as PNG.',
  );
}
