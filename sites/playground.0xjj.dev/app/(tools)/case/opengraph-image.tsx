import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'Case Converter';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage(
    'Case Converter',
    'Convert text between camelCase, PascalCase, snake_case, kebab-case, and UPPER_SNAKE_CASE.',
  );
}
