import type { Metadata } from 'next';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { tools, categories } from './lib/tools';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://playground.0xjj.dev'),
  title: {
    template: '%s | Playground',
    default: 'Playground',
  },
  description: 'A playground for tools, games & experiments.',
  openGraph: {
    siteName: 'Playground',
    type: 'website',
    locale: 'en',
  },
  twitter: {
    card: 'summary_large_image',
  },
  alternates: {
    canonical: './',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: '{"@context":"https://schema.org","@type":"WebSite","name":"Playground","url":"https://playground.0xjj.dev","author":{"@type":"Person","name":"Junya Kono","url":"https://0xjj.dev"}}' }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-bg text-fg antialiased">
        <NuqsAdapter>
        {children}
        <footer className="border-t border-[color-mix(in_srgb,var(--color-fg)_8%,transparent)] px-4 py-10">
          <nav className="mx-auto mb-8 grid max-w-3xl gap-8 sm:grid-cols-3">
            {categories.map((cat) => {
              const items = tools.filter((t) => t.category === cat.value);
              return (
                <div key={cat.value}>
                  <h3 className="mb-3 font-mono text-xs font-medium text-fg">
                    {cat.label}
                  </h3>
                  <ul className="flex flex-col gap-1.5">
                    {items.map((tool) => (
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
                </div>
              );
            })}
          </nav>
          <p className="text-center font-mono text-xs text-muted">
            Created by{' '}
            <a
              href="https://0xjj.dev"
              className="text-fg underline underline-offset-2 transition-opacity hover:opacity-60"
            >
              JJ
            </a>
          </p>
        </footer>
        </NuqsAdapter>
      </body>
    </html>
  );
}
