import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'Number Base Converter';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage('Number Base Converter', 'Convert numbers between binary, octal, decimal, and hexadecimal.');
}
