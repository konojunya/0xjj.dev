import type { Metadata } from 'next';
import { tools } from '../lib/tools';
import JsonFormatter from './JsonFormatter';

const tool = tools.find((t) => t.slug === 'json')!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

export default function Page() {
  return <JsonFormatter />;
}
