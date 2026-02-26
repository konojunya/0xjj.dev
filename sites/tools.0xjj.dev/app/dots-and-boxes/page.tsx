import type { Metadata } from 'next';
import { tools } from '../lib/tools';
import DotsAndBoxes from './DotsAndBoxes';

const tool = tools.find((t) => t.slug === 'dots-and-boxes')!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

export default function Page() {
  return <DotsAndBoxes />;
}
