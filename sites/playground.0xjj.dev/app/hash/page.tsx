import type { Metadata } from 'next';
import { tools } from '../lib/tools';
import HashCalculator from './HashCalculator';

const tool = tools.find((t) => t.slug === 'hash')!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

export default function Page() {
  return <HashCalculator />;
}
