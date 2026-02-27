import type { Metadata } from 'next';
import { tools } from './lib/tools';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://playground.0xjj.dev'),
  title: {
    template: '%s | Playground',
    default: 'Playground',
  },
  description: 'A playground for tools, games & experiments.',
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
        <footer className="border-t border-[color-mix(in_srgb,var(--color-fg)_8%,transparent)] px-4 py-8">
          <nav className="mx-auto mb-6 max-w-5xl">
            <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2">
              {tools.map((tool) => (
                <li key={tool.slug}>
                  <a
                    href={tool.href}
                    className="font-mono text-xs text-muted transition-colors hover:text-fg"
                  >
                    {tool.slug}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
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
