import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'EXIF Viewer';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage('EXIF Viewer', 'View embedded metadata (EXIF, XMP, IPTC) from images and PDF documents.');
}
