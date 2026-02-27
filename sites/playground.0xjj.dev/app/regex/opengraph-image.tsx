import { createOgImage, OG_SIZE } from '../lib/og';

export const alt = 'RegEx Tester';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return createOgImage('RegEx Tester', 'Test regular expressions with live match highlighting.');
}
