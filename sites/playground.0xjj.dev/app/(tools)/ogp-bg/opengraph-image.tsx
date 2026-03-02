import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'OGP Background Generator';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage(
    'OGP Background Generator',
    'Extract colors from an image and generate a 1200×630 OGP background.',
  );
}
