import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'Sensor Card';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage('Sensor Card', 'Tilt your phone to move the card — powered by device motion sensor.');
}
