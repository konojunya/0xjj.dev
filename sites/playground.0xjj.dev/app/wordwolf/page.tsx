import type { Metadata } from 'next';
import { tools } from '../lib/tools';
import WordWolf from './WordWolf';

const tool = tools.find((t) => t.slug === 'wordwolf')!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

export default function Page() {
  return <WordWolf />;
}
