import { createOgImage, OG_SIZE } from '../lib/og';

export const alt = 'Word Wolf';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return createOgImage('Word Wolf', 'ワードウルフ - 仲間の中に紛れた「ウルフ」を見つけ出せ!');
}
