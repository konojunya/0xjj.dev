import createMDX from '@next/mdx';

const withMDX = createMDX({
  options: {
    remarkPlugins: ['remark-gfm'],
  },
});

/** @type {import('next').NextConfig} */
const config = {
  pageExtensions: ['ts', 'tsx', 'mdx'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'assets.xross-stars.com' },
    ],
  },
};

export default withMDX(config);
