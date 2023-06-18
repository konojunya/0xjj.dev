import { GrHomeOption, GrUser, GrNote } from "react-icons/gr";
import {
  SiTwitter,
  SiFacebook,
  SiGithub,
  SiZenn,
  SiOpensea,
} from "react-icons/si";
import styles from "./index.module.scss";

export const MENU_ITEMS = [
  { icon: <GrHomeOption className={styles.svg} />, label: "Home", href: "/" },
  { icon: <GrUser className={styles.svg} />, label: "About", href: "/about" },
  { icon: <GrNote className={styles.svg} />, label: "Resume", href: "/resume" },
  // TODO: ある程度作ってから navigaiton に追加する
  // { icon: <GrCube className={styles.svg} />, label: "Craft", href: "/craft" },
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
