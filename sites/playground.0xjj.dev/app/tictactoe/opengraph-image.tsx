import { createOgImage, OG_SIZE } from '../lib/og';

export const alt = 'Tic-Tac-Toe';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage('Tic-Tac-Toe', 'Real-time multiplayer Tic-Tac-Toe. Create a room, share the link, and play.');
}
