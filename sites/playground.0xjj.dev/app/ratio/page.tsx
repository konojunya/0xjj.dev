import type { Metadata } from 'next';
import { tools } from '../lib/tools';
import RatioCalculator from './RatioCalculator';

const tool = tools.find((t) => t.slug === 'ratio')!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

export default function Page() {
  return <RatioCalculator />;
}
