import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'Air Flow';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage('Air Flow', 'Webカメラの動きをオプティカルフローで検出し、パーティクルが空気のように流されるインタラクティブ可視化。');
}
