import { createOgImage, OG_SIZE } from '../lib/og';

export const alt = 'HTTP Inspector';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage('HTTP Inspector', 'Inspect HTTP response headers, body preview, and DNS records for any URL.');
}
