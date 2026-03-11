import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'Rössler Attractor';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage(
    'Rössler Attractor',
    'Interactive 3D Rössler attractor rendered as flowing colored lines in a WebGL2 fragment shader.',
  );
}
