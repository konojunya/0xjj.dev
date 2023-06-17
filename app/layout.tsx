import { Navigation } from "@components/shared/Navigation";
import "./global.scss";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "JJ",
  description: "All of me",
  authors: { name: "Junya Kono" },
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
        <Navigation />
        <main>{children}</main>
      </body>
    </html>
  );
}
