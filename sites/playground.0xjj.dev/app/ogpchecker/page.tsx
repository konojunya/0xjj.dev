import type { Metadata } from 'next';
import { tools } from '../lib/tools';
import OgpChecker from './OgpChecker';

const tool = tools.find((t) => t.slug === 'ogpchecker')!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

export default function Page() {
  return <OgpChecker />;
}
