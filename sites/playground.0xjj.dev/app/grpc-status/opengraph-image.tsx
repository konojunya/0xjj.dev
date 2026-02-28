import { createOgImage, OG_SIZE } from '../lib/og';

export const alt = 'gRPC Status Codes';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage(
    'gRPC Status Codes',
    'Browse all gRPC status codes with HTTP equivalents.',
  );
}
