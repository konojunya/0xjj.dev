import Head from "next/head";
import "./global.scss";

export const metadata = {
  title: "0xjj.dev",
  description: "All of me",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <Head>
        <link
          href="https://fonts.cdnfonts.com/css/sf-pro-display"
          rel="stylesheet"
        />
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.min.css"
          rel="stylesheet"
        />
      </Head>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
