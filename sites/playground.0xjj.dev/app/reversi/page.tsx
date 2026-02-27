import type { Metadata } from 'next';
import { tools } from '../lib/tools';
import Reversi from './Reversi';

const tool = tools.find((t) => t.slug === 'reversi')!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

export default function Page() {
  return <Reversi />;
}
