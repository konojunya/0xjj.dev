import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'Word Wolf';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage('Word Wolf', 'Find the wolf hiding among your friends! A real-time party game for 3-8 players.');
}
