import type { Metadata } from 'next';
import { tools } from '../lib/tools';
import EasingVisualizer from './EasingVisualizer';

const tool = tools.find((t) => t.slug === 'easing')!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

export default function Page() {
  return <EasingVisualizer />;
}
