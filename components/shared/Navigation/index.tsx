"use client";

import styles from "./index.module.scss";
import { GrHomeOption, GrUser, GrNote } from "react-icons/gr";
import {
  SiTwitter,
  SiFacebook,
  SiGithub,
  SiZenn,
  SiOpensea,
} from "react-icons/si";
import { useRouter } from "next/navigation";

const MENU_ITEMS = [
  { icon: <GrHomeOption className={styles.svg} />, label: "Home", href: "/" },
  { icon: <GrUser className={styles.svg} />, label: "About", href: "/about" },
  { icon: <GrNote className={styles.svg} />, label: "Resume", href: "/resume" },
  { id: "hr" },
  {
    icon: <SiTwitter className={styles.siIcon} />,
    label: "Twitter",
    href: "https://twitter.com/konojunya",
  },
  {
    icon: <SiFacebook className={styles.siIcon} />,
    label: "Facebook",
    href: "https://www.facebook.com/0xjj.eth",
  },
  {
    icon: <SiGithub className={styles.siIcon} />,
    label: "GitHub",
    href: "https://github.com/konojunya",
  },
  {
    icon: <SiZenn className={styles.siIcon} />,
    label: "Zenn",
    href: "https://zenn.dev/jj",
  },
  {
    icon: <SiOpensea className={styles.siIcon} />,
    label: "OpenSea",
    href: "https://opensea.io/konojunya",
  },
];

export const Navigation: React.FC = () => {
  const router = useRouter();

  const navigation = (e: React.MouseEvent<HTMLButtonElement>) => {
    const href = e.currentTarget.dataset.href;
    if (href == null) {
      return;
    }

    if (href.startsWith("https")) {
      window.open(href, "_blank");
      return;
    }

    router.push(href);
  };

  return (
    <nav className={styles.nav}>
      <ul className={styles.ul}>
        {MENU_ITEMS.map((item) => {
          if (item.id === "hr") {
            return <li key={item.label}>｜</li>;
          }

          return (
            <li key={item.label}>
              <button
                className={styles.button}
                tabIndex={0}
                data-href={item.href}
                onClick={navigation}
              >
                {item.icon}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
