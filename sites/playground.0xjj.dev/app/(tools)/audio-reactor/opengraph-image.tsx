import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'Audio Reactor';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage(
    'Audio Reactor',
    'Raymarched kaleidoscope VJ visualisation driven by microphone FFT — bass morphs shapes, treble adds noise, beats trigger flashes.',
  );
}
