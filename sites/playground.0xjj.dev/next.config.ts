import type { NextConfig } from 'next';

const config: NextConfig = {
  webpack(config) {
    config.module.rules.push({
      test: /\.md$/,
      type: 'asset/source',
    });
    return config;
  },
};

export default config;
