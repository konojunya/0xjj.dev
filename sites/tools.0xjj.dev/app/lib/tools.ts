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
];
