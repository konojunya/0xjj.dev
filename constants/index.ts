import { SNS } from "./sns";

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
  { label: "HTML", date: "2015 - " },
  { label: "CSS", date: "2015 - " },
  { label: "JavaScript", date: "2015 - " },
  { label: "TypeScript", date: "2017 - " },
  { label: "React", date: "2017 - " },
  { label: "Fastly", date: "2019 - " },
  { label: "GCP", date: "2019 - " },
  { label: "Go", date: "2019 - 🤔" },
  { label: "Vim Script", date: "2019 - 🤔" },
  { label: "Next.js", date: "2020 - " },
  { label: "Rust", date: "2020 - 🤔" },
  { label: "Blockchain", date: "2022 - " },
];

export const HOBBY = ["Apex", "シーシャ", "ヴァイオリン", "OSS"];

export const MAIN_JOB = [
  {
    name: "microverse株式会社",
    jobTitle: "CTO",
    date: "2022/07 - ",
    url: "https://microverse.co.jp",
    services: [
      {
        title: "Stella",
        url: "https://stella-app.io",
        image: "https://stella-app.io/ogp.png",
      },
    ],
  },
  {
    name: "トリコ株式会社",
    jobTitle: "Tech Lead",
    date: "2020/10 - 2022/06",
    url: "https://tricot-inc.com/",
    services: [
      {
        title: "FUJIMI",
        url: "https://fujimi.me",
        image:
          "https://assets.fujimi.me/kmi/0daccb74-c22b-4341-9040-c67f3f0f2adc.jpeg?width=1200&height=630",
      },
    ],
  },
  {
    name: "株式会社サイバーエージェント",
    jobTitle: "Software Engineer",
    date: "2019/04 - 2020/09",
    url: "https://www.cyberagent.co.jp/",
    services: [
      {
        title: "WINTICKET",
        url: "https://www.winticket.jp/",
        image: "https://www.winticket.jp/assets/1b11d0/ogp.png",
      },
    ],
  },
];

export const SIDE_JOB = [
  {
    title: "株式会社タイミー",
    url: "https://timee.co.jp/",
    image:
      "https://timee.co.jp/wp-content/themes/taimee-hp/img/OGP20191126.png",
  },
  {
    title: "TOMIE by Junji Ito",
    url: "https://nft.ji-anime.com/ja",
    image: "https://nft.ji-anime.com/image/ogp.png",
  },
  {
    title: "Lovegraph",
    url: "https://lovegraph.me/",
    image: "https://s3-assets.lovegraph.me/og_image.jpg",
  },
  {
    title: "PATRA",
    url: "https://patra.store/",
    image:
      "https://patra.imgix.net/videos/2022-02-17/45fff08e-434d-478f-be6f-89031e6d2e1c.jpg",
  },
  {
    title: "Progate",
    url: "https://prog-8.com/",
    image: "https://prog-8.com/images/ogp/default.png",
  },
  {
    title: "Ameba",
    url: "https://www.ameba.jp/",
    image: "https://stat100.ameba.jp/www/img/ogp/ogp_ameba.png",
  },
];

export const SPEAKER = [
  {
    title: "FUJIMI の Fastly 活用事例",
    href: "https://speakerdeck.com/konojunya/fastly-case-studies-at-fujimi",
    image:
      "https://files.speakerdeck.com/presentations/957725a927f747e2ac61b3687565dfa4/slide_0.jpg?20920207",
  },
  {
    title: "Progressive Release by using Fastly",
    href: "https://speakerdeck.com/konojunya/progressive-release-by-using-fastly-8a9fc1f5-8730-44f3-8981-986e47498c6d",
    image:
      "https://files.speakerdeck.com/presentations/fffaff3afd93415d88df96b0a4219ecc/slide_0.jpg?18839933",
  },
  {
    title: "WinTicketにおけるPWA at PWA Night vol.9 の Fastly 活用事例",
    href: "https://speakerdeck.com/konojunya/winticketniokerupwa-at-pwa-night-vol-dot-9",
    image:
      "https://files.speakerdeck.com/presentations/038e10e9e39d48ccb48388d58eb1933f/slide_0.jpg?13893203",
  },
  {
    title: "新卒研修を終えて",
    href: "https://speakerdeck.com/konojunya/xin-zu-yan-xiu-wozhong-ete",
    image:
      "https://files.speakerdeck.com/presentations/0143e6d662a0486c9c32c5949cf3be76/slide_0.jpg?12552400",
  },
  {
    title: "大規模なWebの開発手法",
    href: "https://speakerdeck.com/konojunya/da-gui-mo-nawebfalsekai-fa-shou-fa",
    image:
      "https://files.speakerdeck.com/presentations/1d9ebd7714d8431ca2fc1c6da70f5445/slide_0.jpg?10112424",
  },
];
