import { Navigation } from "@components/shared/Navigation";
import { Analytics } from "@vercel/analytics/react";
import "./global.scss";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "JJ",
  description: "All of me",
  authors: { name: "Junya Kono" },
  icons: ["/favicon.svg"],
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "https://0xjj.dev",
    siteName: "JJ",
    title: "JJ",
    description: "All of me",
    images: "https://0xjj.dev/ogp.png",
  },
  twitter: {
    card: "summary_large_image",
    site: "@konojunya",
    creator: "@konojunya",
    title: "JJ",
    description: "All of me",
    images: "https://0xjj.dev/ogp.png",
  },
  viewport: {
    width: "device-width, initial-scale=1.0, viewport-fit=cover",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.min.css"
          rel="stylesheet"
        />
      </head>
      <body>
        <Navigation />
        <main>{children}</main>
        <Analytics />
      </body>
    </html>
  );
}
