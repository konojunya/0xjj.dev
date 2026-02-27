import type { Metadata } from 'next';
import { tools } from '../lib/tools';
import LiquidGlass from './LiquidGlass';

const tool = tools.find((t) => t.slug === 'liquid-glass')!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

export default function Page() {
  return <LiquidGlass />;
}
