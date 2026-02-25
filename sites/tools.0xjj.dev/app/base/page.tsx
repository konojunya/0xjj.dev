import type { Metadata } from 'next';
import { tools } from '../lib/tools';
import BaseConverter from './BaseConverter';

const tool = tools.find((t) => t.slug === 'base')!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

export default function Page() {
  return <BaseConverter />;
}
