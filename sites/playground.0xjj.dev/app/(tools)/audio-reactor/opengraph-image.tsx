import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'Audio Reactor';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage(
    'Audio Reactor',
    'Raymarched kaleidoscope VJ driven by microphone FFT — richer audio fractures the kaleidoscope further, bass pumps shapes, beats flash the screen.',
  );
}
