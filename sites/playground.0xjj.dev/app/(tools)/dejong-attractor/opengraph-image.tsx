import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'De Jong Attractor';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage(
    'De Jong Attractor',
    'Interactive 2D De Jong attractor rendered as colored line segments in a WebGL2 fragment shader.',
  );
}
