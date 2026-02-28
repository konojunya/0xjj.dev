import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'CSS Specificity Calculator';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage(
    'CSS Specificity Calculator',
    'Calculate and compare CSS selector specificity (a, b, c) values.',
  );
}
