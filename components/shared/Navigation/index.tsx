"use client";

import styles from "./index.module.scss";
import { useRouter } from "next/navigation";
import { MENU_ITEMS } from "./constants";

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
    <header>
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
    </header>
  );
};
