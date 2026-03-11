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
const baseCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://games-api.0xjj.dev wss://games-api.0xjj.dev",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
];

const faceDetectCsp = baseCsp.map((directive) => {
  if (directive.startsWith('script-src ')) {
    return "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://static.cloudflareinsights.com";
  }
  if (directive.startsWith('connect-src ')) {
    return "connect-src 'self' data: https://games-api.0xjj.dev wss://games-api.0xjj.dev";
  }
  return directive;
});

function buildSecurityHeaders({
  csp = baseCsp,
  permissionsPolicy = 'camera=(), microphone=(), geolocation=()',
} = {}) {
  return [
    {
      key: 'Content-Security-Policy',
      value: csp.join('; '),
    },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    { key: 'Permissions-Policy', value: permissionsPolicy },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
    { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  ];
}

const config = {
  poweredByHeader: false,
  pageExtensions: ['ts', 'tsx', 'mdx'],
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: buildSecurityHeaders(),
      },
      {
        source: '/face-detect',
        headers: buildSecurityHeaders({
          csp: faceDetectCsp,
          permissionsPolicy: 'camera=(self), microphone=(), geolocation=()',
        }),
      },
      {
        source: '/face-detect/:path*',
        headers: buildSecurityHeaders({
          csp: faceDetectCsp,
          permissionsPolicy: 'camera=(self), microphone=(), geolocation=()',
        }),
      },
    ];
  },
};

export default withMDX(config);
