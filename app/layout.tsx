import "./global.scss";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "0xjj.dev",
  description: "All of me",
  robots: {
    index: false,
    follow: false,
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
          href="https://fonts.cdnfonts.com/css/sf-pro-display"
          rel="stylesheet"
        />
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.min.css"
          rel="stylesheet"
        />
      </head>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
