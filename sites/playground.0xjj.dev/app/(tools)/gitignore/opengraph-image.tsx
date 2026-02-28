import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = '.gitignore Generator';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage(
    '.gitignore Generator',
    'Generate .gitignore files for your project using the gitignore.io API.',
  );
}
