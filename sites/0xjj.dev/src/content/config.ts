import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
  }),
});

const timeline = defineCollection({
  loader: file('./src/content/timeline.yaml'),
  schema: z.object({
    type: z.literal('work'),
    date: z.coerce.date(),
    title: z.string(),
    role: z.string(),
    url: z.string().optional(),
  }),
});

export const collections = { blog, timeline };
