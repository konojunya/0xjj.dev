import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'Physarum';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage(
    'Physarum',
    'Slime mold simulation — agents deposit and follow chemical trails, self-organising into organic network patterns.',
  );
}
