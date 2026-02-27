import type { Metadata } from 'next';
import { tools } from '../lib/tools';
import CronParser from './CronParser';

const tool = tools.find((t) => t.slug === 'cron')!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

export default function Page() {
  return <CronParser />;
}
