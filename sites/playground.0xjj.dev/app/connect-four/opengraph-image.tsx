import { createOgImage, OG_SIZE } from '../lib/og';

export const alt = 'Connect Four';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage('Connect Four', 'Drop discs to connect four in a row. Real-time multiplayer.');
}
