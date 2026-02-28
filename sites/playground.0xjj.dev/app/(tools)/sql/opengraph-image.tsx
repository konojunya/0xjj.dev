import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'SQL Formatter';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage(
    'SQL Formatter',
    'Format and prettify SQL queries with dialect support.',
  );
}
