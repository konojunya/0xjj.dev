import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'Gyro Card';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage('Gyro Card', 'Tilt your phone to move the card — powered by device accelerometer.');
}
