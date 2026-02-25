import type { Metadata } from 'next';
import './globals.css';
import ToolMap from './components/ToolMap';

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
      <body className="min-h-screen antialiased">
        <div className="sticky top-4 z-10 px-4">
          <header className="mx-auto flex h-11 max-w-5xl items-center justify-between rounded-2xl border border-[color-mix(in_srgb,var(--color-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--color-bg)_80%,transparent)] px-5 shadow-sm backdrop-blur-md">
            <a href="/" className="font-mono text-sm font-medium tracking-tight text-fg">
              tools.0xjj.dev
            </a>
            <ToolMap />
          </header>
        </div>
        {children}
      </body>
    </html>
  );
}
