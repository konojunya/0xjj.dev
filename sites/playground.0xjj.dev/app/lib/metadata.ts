import type { Metadata } from 'next';
import { tools } from './tools';

export function createToolMetadata(slug: string): Metadata {
  const tool = tools.find((t) => t.slug === slug)!;
  return {
    title: tool.name,
    description: tool.description,
    openGraph: {
      title: tool.name,
      description: tool.description,
    },
    twitter: {
      card: 'summary_large_image',
      title: tool.name,
      description: tool.description,
    },
  };
}
