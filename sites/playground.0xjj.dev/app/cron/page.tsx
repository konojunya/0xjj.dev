import { createToolMetadata } from '../lib/metadata';
import CronParser from './CronParser';

export const metadata = createToolMetadata('cron');

export default function Page() {
  return <CronParser />;
}
