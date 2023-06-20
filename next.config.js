/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  images: {
    domains: [
      "stella-app.io",
      "assets.fujimi.me",
      "www.winticket.jp",
      "timee.co.jp",
      "nft.ji-anime.com",
      "s3-assets.lovegraph.me",
      "patra.imgix.net",
      "prog-8.com",
      "stat100.ameba.jp",
      "files.speakerdeck.com",
      "meumeu-shisha.com",
    ],
  },
  output: "standalone",
};

module.exports = config;
