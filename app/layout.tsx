import { Inter } from "next/font/google";

import "./globals.css";
import { generateMetadata } from "@/lib/meta";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = generateMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
