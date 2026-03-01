import type { MetadataRoute } from 'next';
import { tools } from './lib/tools';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://playground.0xjj.dev';
  return [
    { url: `${base}/`, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    ...tools.map((t) => ({
      url: `${base}${t.href}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
