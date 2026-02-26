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
  {
    slug: 'exif',
    name: 'EXIF Viewer',
    description: 'View embedded metadata (EXIF, XMP, IPTC) from images and PDF documents.',
    href: '/exif',
  },
  {
    slug: 'ratio',
    name: 'Ratio Calculator',
    description: 'Simplify ratios and calculate missing values from a known ratio.',
    href: '/ratio',
  },
  {
    slug: 'color',
    name: 'Color Converter',
    description: 'Convert any CSS color format — HEX, RGB, HSL, OKLAB, OKLCH, and more.',
    href: '/color',
  },
  {
    slug: 'json',
    name: 'JSON Formatter',
    description: 'Format and validate JSON with syntax error reporting.',
    href: '/json',
  },
  {
    slug: 'base64',
    name: 'Base64 Encoder / Decoder',
    description: 'Encode text to Base64 or decode Base64 back to text.',
    href: '/base64',
  },
  {
    slug: 'jwt',
    name: 'JWT Decoder',
    description: 'Decode and inspect JWT header, payload, and expiry.',
    href: '/jwt',
  },
  {
    slug: 'easing',
    name: 'Easing Visualizer',
    description: 'Visualize and preview cubic-bezier easing curves for CSS.',
    href: '/easing',
  },
  {
    slug: 'regex',
    name: 'RegEx Tester',
    description: 'Test regular expressions with live match highlighting.',
    href: '/regex',
  },
  {
    slug: 'uuid',
    name: 'UUID Generator',
    description: 'Generate v4 UUIDs instantly, in bulk.',
    href: '/uuid',
  },
  {
    slug: 'hash',
    name: 'Hash Calculator',
    description: 'Compute SHA-1, SHA-256, SHA-384, and SHA-512 hashes of any text.',
    href: '/hash',
  },
  {
    slug: 'base',
    name: 'Number Base Converter',
    description: 'Convert numbers between binary, octal, decimal, and hexadecimal.',
    href: '/base',
  },
  {
    slug: 'cron',
    name: 'Cron Expression Parser',
    description: 'Parse cron expressions and preview the next scheduled run times.',
    href: '/cron',
  },
  {
    slug: 'tictactoe',
    name: 'Tic-Tac-Toe',
    description: 'Real-time multiplayer Tic-Tac-Toe. Create a room, share the link, and play.',
    href: '/tictactoe',
  },
  {
    slug: 'wordwolf',
    name: 'Word Wolf',
    description: 'ワードウルフ - 仲間の中に紛れた「ウルフ」を見つけ出せ!',
    href: '/wordwolf',
  },
];
