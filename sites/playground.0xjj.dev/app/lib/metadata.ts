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
      images: [{ url: `/og/${slug}.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: tool.name,
      description: tool.description,
      images: [`/og/${slug}.png`],
    },
  };
}
