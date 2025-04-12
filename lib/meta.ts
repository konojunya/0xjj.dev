import type { Metadata } from "next";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_ORIGIN: string;
    }
  }
}

export function generateMetadata(params?: {
  title?: string;
  description?: string;
}): Metadata {
  const { title: baseTitle, description: baseDescription } = params ?? {};
  const title = generateTitle(baseTitle);
  const description = generateDescription(baseDescription);
  const images = generateOGP();

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_ORIGIN),
    title,
    description,
    openGraph: {
      title,
      description,
      images,
      locale: "ja",
      siteName: "0xjj.dev",
      type: "website",
      url: process.env.NEXT_PUBLIC_ORIGIN,
    },
    twitter: {
      title,
      description,
      images,
      card: "summary_large_image",
    },
  };
}

function generateTitle(title?: string) {
  const baseTitle = "JJ";

  if (!title) {
    return baseTitle;
  }

  return `${title} | ${baseTitle}`;
}

function generateDescription(description?: string) {
  const baseDescription = "All of me";

  if (!description) {
    return baseDescription;
  }

  return description;
}

function generateOGP(path?: string) {
  if (!path) {
    return "https://0xjj.dev/ogp.png";
  }

  const baseURL = process.env.NEXT_PUBLIC_ORIGIN;
  const url = new URL(path ?? "", baseURL);

  return url.toString();
}
