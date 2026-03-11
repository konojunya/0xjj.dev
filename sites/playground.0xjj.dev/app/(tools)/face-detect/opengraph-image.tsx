import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'Face Detect Camera';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage('Face Detect Camera', 'ローカルのWebカメラ映像をcanvasに描画し、OpenCV.jsでブラウザ内だけで顔検出を行います。');
}
