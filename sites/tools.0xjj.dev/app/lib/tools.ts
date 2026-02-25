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
];
