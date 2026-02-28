import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'Easing Visualizer';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage('Easing Visualizer', 'Visualize and preview cubic-bezier easing curves for CSS.');
}
