import { createOgImage, OG_SIZE } from '../lib/og';

export const alt = 'Semver Range Checker';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage(
    'Semver Range Checker',
    'Check if version numbers satisfy a semver range like ^1.2.3 or >=2.0.0 <3.0.0.',
  );
}
