import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'Mandelbulb';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage(
    'Mandelbulb',
    '3D Mandelbulb fractal rendered via GPU ray marching in WebGPU.',
  );
}
