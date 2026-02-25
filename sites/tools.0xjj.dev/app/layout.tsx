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
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        <div className="sticky top-4 z-10 px-4">
          <header className="mx-auto flex h-11 max-w-5xl items-center justify-between rounded-2xl border border-neutral-200/80 bg-white/75 px-5 shadow-sm shadow-neutral-900/5 backdrop-blur-md">
            <a href="/" className="font-mono text-sm font-medium tracking-tight">
              tools.0xjj.dev
            </a>
          </header>
        </div>
        {children}
      </body>
    </html>
  );
}
