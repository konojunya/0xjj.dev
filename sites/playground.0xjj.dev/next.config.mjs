import createMDX from '@next/mdx';
import remarkGfm from 'remark-gfm';

const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkGfm],
  },
});

/** @type {import('next').NextConfig} */
const config = {
  pageExtensions: ['ts', 'tsx', 'mdx'],
};

export default withMDX(config);
