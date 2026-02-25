import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://tools.0xjj.dev'),
  title: {
    template: '%s | tools.0xjj.dev',
    default: 'tools.0xjj.dev',
  },
  description: 'Useful tools by JJ',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-bg text-fg antialiased">
        {children}
        <footer className="border-t border-[color-mix(in_srgb,var(--color-fg)_8%,transparent)] px-4 py-6">
          <p className="text-center font-mono text-xs text-muted">
            Created by{' '}
            <a
              href="https://0xjj.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-fg underline underline-offset-2 transition-opacity hover:opacity-60"
            >
              JJ
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
