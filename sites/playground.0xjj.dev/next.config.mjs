import createMDX from '@next/mdx';

const withMDX = createMDX({
  options: {
    remarkPlugins: ['remark-gfm'],
    rehypePlugins: [
      [
        'rehype-pretty-code',
        {
          theme: { dark: 'github-dark', light: 'github-light' },
          keepBackground: false,
        },
      ],
    ],
  },
});

/** @type {import('next').NextConfig} */
const config = {
  poweredByHeader: false,
  pageExtensions: ['ts', 'tsx', 'mdx'],
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withMDX(config);
