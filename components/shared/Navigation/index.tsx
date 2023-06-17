import styles from "./index.module.scss";
import { MENU_ITEMS } from "./constants";
import Link from "next/link";

export const Navigation: React.FC = () => {
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
                <Link
                  className={styles.link}
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  href={item.href!}
                  target={
                    item.href?.startsWith("https://") ? "_blank" : "_self"
                  }
                  rel={
                    item.href?.startsWith("https://") ? "noreferrer" : undefined
                  }
                >
                  {item.icon}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
};
