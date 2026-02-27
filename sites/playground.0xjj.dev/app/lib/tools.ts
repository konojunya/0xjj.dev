export type Category = 'tool' | 'game' | 'ui';

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
  { value: 'ui', label: 'UI Lab' },
];

export const tools: Tool[] = [
  // ── Tools (A→Z) ──
  {
    slug: 'base64',
    name: 'Base64 Encoder / Decoder',
    description: 'Encode text to Base64 or decode Base64 back to text.',
    href: '/base64',
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
    slug: 'cron',
    name: 'Cron Expression Parser',
    description: 'Parse cron expressions and preview the next scheduled run times.',
    href: '/cron',
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
    slug: 'exif',
    name: 'EXIF Viewer',
    description: 'View embedded metadata (EXIF, XMP, IPTC) from images and PDF documents.',
    href: '/exif',
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
    slug: 'json',
    name: 'JSON Formatter',
    description: 'Format and validate JSON with syntax error reporting.',
    href: '/json',
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
    slug: 'base',
    name: 'Number Base Converter',
    description: 'Convert numbers between binary, octal, decimal, and hexadecimal.',
    href: '/base',
    category: 'tool',
  },
  {
    slug: 'ogpchecker',
    name: 'OGP Checker',
    description: 'Inspect Open Graph, Twitter Card, and all meta tags for any URL.',
    href: '/ogpchecker',
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
  // ── UI Lab (A→Z) ──
  {
    slug: 'liquid-glass',
    name: 'Liquid Glass',
    description: 'Apple-inspired Liquid Glass effect using SVG filters and backdrop-filter.',
    href: '/liquid-glass',
    category: 'ui',
  },
  {
    slug: 'tilt-card',
    name: 'Tilt Card',
    description: 'Interactive 3D tilt card with flip animation powered by Motion.',
    href: '/tilt-card',
    category: 'ui',
  },
  // ── Games (A→Z) ──
  {
    slug: '2048',
    name: '2048',
    description: 'Slide and merge tiles to reach 2048. A classic single-player puzzle game.',
    href: '/2048',
    category: 'game',
  },
  {
    slug: 'connect-four',
    name: 'Connect Four',
    description: 'Drop discs to connect four in a row. Real-time multiplayer.',
    href: '/connect-four',
    category: 'game',
  },
  {
    slug: 'dots-and-boxes',
    name: 'Dots & Boxes',
    description: 'Draw lines to complete boxes and outscore your opponent.',
    href: '/dots-and-boxes',
    category: 'game',
  },
  {
    slug: 'reversi',
    name: 'Reversi',
    description: 'Classic disc-flipping strategy game. Real-time multiplayer.',
    href: '/reversi',
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
