import type { Metadata } from 'next';
import { tools } from '../lib/tools';
import RegexTester from './RegexTester';

const tool = tools.find((t) => t.slug === 'regex')!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

export default function Page() {
  return <RegexTester />;
}
