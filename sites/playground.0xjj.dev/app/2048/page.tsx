import type { Metadata } from 'next';
import { tools } from '../lib/tools';
import Game2048 from './Game2048';

const tool = tools.find((t) => t.slug === '2048')!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

export default function Page() {
  return <Game2048 />;
}
