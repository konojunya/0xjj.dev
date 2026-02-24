import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
  }),
});

const work = defineCollection({
  loader: file('./src/content/work.yaml'),
  schema: z.object({
    date: z.coerce.date(),
    title: z.string(),
    role: z.string(),
    url: z.string().optional(),
  }),
});

const project = defineCollection({
  loader: file('./src/content/project.yaml'),
  schema: z.object({
    date: z.coerce.date(),
    title: z.string(),
    url: z.string(),
    render: z.string().optional(),
  }),
});

const skill = defineCollection({
  loader: file('./src/content/skills.yaml'),
  schema: z.object({
    id: z.string(),
    rate: z.number().min(1).max(5),
    category: z.string().optional(),
  }),
});

export const collections = { blog, work, project, skill };
