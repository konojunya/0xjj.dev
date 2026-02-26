export type Category = 'tool' | 'game';

export interface Tool {
  slug: string;
  name: string;
  description: string;
  href: string;
  category: Category;
}

export const categories: { value: Category; label: string }[] = [
  { value: 'tool', label: 'Tools' },
  { value: 'game', label: 'Games' },
];

export const tools: Tool[] = [
  {
    slug: 'ogpchecker',
    name: 'OGP Checker',
    description: 'Inspect Open Graph, Twitter Card, and all meta tags for any URL.',
    href: '/ogpchecker',
    category: 'tool',
  },
  {
    slug: 'exif',
    name: 'EXIF Viewer',
    description: 'View embedded metadata (EXIF, XMP, IPTC) from images and PDF documents.',
    href: '/exif',
    category: 'tool',
  },
  {
    slug: 'ratio',
    name: 'Ratio Calculator',
    description: 'Simplify ratios and calculate missing values from a known ratio.',
    href: '/ratio',
    category: 'tool',
  },
  {
    slug: 'color',
    name: 'Color Converter',
    description: 'Convert any CSS color format — HEX, RGB, HSL, OKLAB, OKLCH, and more.',
    href: '/color',
    category: 'tool',
  },
  {
    slug: 'json',
    name: 'JSON Formatter',
    description: 'Format and validate JSON with syntax error reporting.',
    href: '/json',
    category: 'tool',
  },
  {
    slug: 'base64',
    name: 'Base64 Encoder / Decoder',
    description: 'Encode text to Base64 or decode Base64 back to text.',
    href: '/base64',
    category: 'tool',
  },
  {
    slug: 'jwt',
    name: 'JWT Decoder',
    description: 'Decode and inspect JWT header, payload, and expiry.',
    href: '/jwt',
    category: 'tool',
  },
  {
    slug: 'easing',
    name: 'Easing Visualizer',
    description: 'Visualize and preview cubic-bezier easing curves for CSS.',
    href: '/easing',
    category: 'tool',
  },
  {
    slug: 'regex',
    name: 'RegEx Tester',
    description: 'Test regular expressions with live match highlighting.',
    href: '/regex',
    category: 'tool',
  },
  {
    slug: 'uuid',
    name: 'UUID Generator',
    description: 'Generate v4 UUIDs instantly, in bulk.',
    href: '/uuid',
    category: 'tool',
  },
  {
    slug: 'hash',
    name: 'Hash Calculator',
    description: 'Compute SHA-1, SHA-256, SHA-384, and SHA-512 hashes of any text.',
    href: '/hash',
    category: 'tool',
  },
  {
    slug: 'base',
    name: 'Number Base Converter',
    description: 'Convert numbers between binary, octal, decimal, and hexadecimal.',
    href: '/base',
    category: 'tool',
  },
  {
    slug: 'cron',
    name: 'Cron Expression Parser',
    description: 'Parse cron expressions and preview the next scheduled run times.',
    href: '/cron',
    category: 'tool',
  },
  {
    slug: '2048',
    name: '2048',
    description: 'Slide and merge tiles to reach 2048. A classic single-player puzzle game.',
    href: '/2048',
    category: 'game',
  },
  {
    slug: 'tictactoe',
    name: 'Tic-Tac-Toe',
    description: 'Real-time multiplayer Tic-Tac-Toe. Create a room, share the link, and play.',
    href: '/tictactoe',
    category: 'game',
  },
  {
    slug: 'wordwolf',
    name: 'Word Wolf',
    description: 'Find the wolf hiding among your friends! A real-time party game for 3-8 players.',
    href: '/wordwolf',
    category: 'game',
  },
];
