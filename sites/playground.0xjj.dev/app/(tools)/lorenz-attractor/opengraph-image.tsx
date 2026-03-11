import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'Lorenz Attractor';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage(
    'Lorenz Attractor',
    'Interactive 3D Lorenz attractor rendered as flowing colored lines in a WebGL2 fragment shader.',
  );
}
