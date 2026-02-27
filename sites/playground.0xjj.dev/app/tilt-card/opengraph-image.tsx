import { createOgImage, OG_SIZE } from '../lib/og';

export const alt = 'Tilt Card';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return createOgImage(
    'Tilt Card',
    'Interactive 3D tilt card with flip animation powered by Motion.',
  );
}
