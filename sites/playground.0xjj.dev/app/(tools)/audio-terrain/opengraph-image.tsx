import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'Audio Terrain';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage(
    'Audio Terrain',
    'Microphone FFT spectrum visualised as a real-time 3D terrain — bass creates mountains, treble adds fine detail.',
  );
}
