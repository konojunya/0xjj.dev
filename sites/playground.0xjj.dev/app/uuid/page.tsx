import type { Metadata } from 'next';
import { tools } from '../lib/tools';
import UuidGenerator from './UuidGenerator';

const tool = tools.find((t) => t.slug === 'uuid')!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

export default function Page() {
  return <UuidGenerator />;
}
