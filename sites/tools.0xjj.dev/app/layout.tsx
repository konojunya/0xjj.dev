import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    template: '%s | tools.0xjj.dev',
    default: 'tools.0xjj.dev',
  },
  description: 'Developer tools by JJ',
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
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/80 backdrop-blur-sm">
          <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4">
            <a href="/" className="font-mono text-sm font-medium tracking-tight">
              tools.0xjj.dev
            </a>
            <nav className="flex items-center gap-5">
              <a
                href="/ogpchecker"
                className="font-mono text-xs text-neutral-500 transition-colors hover:text-neutral-900"
              >
                ogpchecker
              </a>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
