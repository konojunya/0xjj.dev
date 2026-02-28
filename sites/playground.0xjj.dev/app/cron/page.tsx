import { createToolMetadata } from '../lib/metadata';
import { trackView } from '../lib/views';
import CronParser from './CronParser';

export const metadata = createToolMetadata('cron');

export default function Page() {
  trackView('cron');
  return <CronParser />;
}
