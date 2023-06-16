import { SNS } from "./url";

export const BASIC_INFO = [
  { label: "名前", value: "河野純也(Junya Kono)" },
  { label: "生年月日", value: "1997/03/03" },
  { label: "居住地", value: "東京" },
  { label: "出身地", value: "神戸" },
];

for (const sns of SNS) {
  BASIC_INFO.push({ label: sns.label, value: sns.id });
}

export const TECH_STACK = [
  "HTML",
  "CSS",
  "JavaScript",
  "TypeScript",
  "Solidity",
  "Next.js",
  "React",
  "CDN",
  "Vercel",
];
