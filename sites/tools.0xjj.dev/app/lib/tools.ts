export interface Tool {
  slug: string;
  name: string;
  description: string;
  href: string;
}

export const tools: Tool[] = [
  {
    slug: 'ogpchecker',
    name: 'OGP Checker',
    description: 'Inspect Open Graph, Twitter Card, and all meta tags for any URL.',
    href: '/ogpchecker',
  },
];
