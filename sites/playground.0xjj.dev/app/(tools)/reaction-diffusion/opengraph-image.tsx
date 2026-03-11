import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'Reaction-Diffusion';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage(
    'Reaction-Diffusion',
    'Gray-Scott reaction-diffusion simulation running entirely on the GPU via WebGPU compute shaders.',
  );
}
