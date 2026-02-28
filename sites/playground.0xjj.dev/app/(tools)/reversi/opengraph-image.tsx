import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'Reversi';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage('Reversi', 'Classic disc-flipping strategy game. Real-time multiplayer.');
}
