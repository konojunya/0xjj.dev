import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'L-System';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage(
    'L-System',
    'Procedural fractal generation through Lindenmayer rewriting grammars and turtle graphics.',
  );
}
