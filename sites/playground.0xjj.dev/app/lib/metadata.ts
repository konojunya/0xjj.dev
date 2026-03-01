import type { Metadata } from 'next';
import { tools } from './tools';

export function createToolMetadata(slug: string): Metadata {
  const tool = tools.find((t) => t.slug === slug)!;
  return {
    title: tool.name,
    description: tool.description,
    alternates: {
      canonical: `/${slug}/`,
    },
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

export function createToolJsonLd(slug: string): string {
  const tool = tools.find((t) => t.slug === slug)!;
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: tool.name,
    url: `https://playground.0xjj.dev${tool.href}`,
    description: tool.description,
    applicationCategory:
      tool.category === 'game' ? 'GameApplication' : 'UtilitiesApplication',
    author: {
      '@type': 'Person',
      name: 'Junya Kono',
      url: 'https://0xjj.dev/',
    },
  });
}
