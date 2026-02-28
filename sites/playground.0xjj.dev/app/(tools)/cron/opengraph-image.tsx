import { createOgImage, OG_SIZE } from '../../lib/og';

export const alt = 'Cron Expression Parser';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage('Cron Expression Parser', 'Parse cron expressions and preview the next scheduled run times.');
}
