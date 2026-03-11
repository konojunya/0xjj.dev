import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'Curl Noise Flow Field';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage(
    'Curl Noise Flow Field',
    'Thousands of particles flowing through a curl noise vector field, creating fluid-like visuals — powered by WebGPU compute shaders.',
  );
}
