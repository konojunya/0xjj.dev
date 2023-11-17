/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  images: {
    domains: ["files.speakerdeck.com"],
  },
  output: "standalone",
};

module.exports = config;
