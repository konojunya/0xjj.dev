import { loadPublicMarkdown } from "@utils/MarkdownUtils";
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
        image: "/resume/main-job/microverse/stella/ogp.png",
        markdown: loadPublicMarkdown(
          "/resume/main-job/microverse/stella/description.md"
        ),
      },
      {
        title: "Crypto Pokers",
        url: "https://crypto-pokers.club",
        image: "/resume/main-job/microverse/crypto-pokers/ogp.png",
        markdown: loadPublicMarkdown(
          "/resume/main-job/microverse/crypto-pokers/description.md"
        ),
      },
      {
        title: "asitis",
        url: "https://asitis.me/",
        image: "/resume/main-job/microverse/asitis/ogp.png",
        markdown: loadPublicMarkdown(
          "/resume/main-job/microverse/asitis/description.md"
        ),
      },
      {
        title: "夜が明けたら、いちばんに君に会いにいく",
        url: "https://yorukiminft.com",
        image: "/resume/main-job/microverse/yorukimi/ogp.png",
        markdown: loadPublicMarkdown(
          "/resume/main-job/microverse/yorukimi/description.md"
        ),
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
        image: "/resume/main-job/tricot/fujimi/ogp.png",
        markdown: loadPublicMarkdown(
          "/resume/main-job/tricot/fujimi/description.md"
        ),
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
        image: "/resume/main-job/cyberagent/winticket/ogp.png",
        markdown: loadPublicMarkdown(
          "/resume/main-job/cyberagent/winticket/description.md"
        ),
      },
    ],
  },
];

export const SIDE_JOB = [
  {
    title: "株式会社タイミー",
    url: "https://timee.co.jp/",
    image: "/resume/side-job/timee/timee/ogp.png",
  },
  {
    title: "めうめうシーシャ",
    url: "https://meumeu-shisha.com/",
    image: "/resume/side-job/mellowcoto/meumeu-shisha/ogp.png",
  },
  {
    title: "TOMIE by Junji Ito",
    url: "https://nft.ji-anime.com/ja",
    image: "/resume/side-job/lead-edge/tomie/ogp.png",
  },
  {
    title: "Lovegraph",
    url: "https://lovegraph.me/",
    image: "/resume/side-job/lovegraph/lovegraph/ogp.jpg",
  },
  {
    title: "PATRA",
    url: "https://patra.store/",
    image: "/resume/side-job/patra/patra/ogp.jpg",
  },
  {
    title: "Progate",
    url: "https://prog-8.com/",
    image: "/resume/side-job/progate/progate/ogp.png",
  },
  {
    title: "Ameba",
    url: "https://www.ameba.jp/",
    image: "/resume/side-job/cyberagent/ameba/ogp.png",
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
