import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'JSON Formatter';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage('JSON Formatter', 'Format and validate JSON with syntax error reporting.');
}
