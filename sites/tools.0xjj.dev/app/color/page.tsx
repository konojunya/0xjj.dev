import type { Metadata } from 'next';
import { tools } from '../lib/tools';
import ColorConverter from './ColorConverter';

const tool = tools.find((t) => t.slug === 'color')!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

export default function Page() {
  return <ColorConverter />;
}
