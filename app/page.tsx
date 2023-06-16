import { Navigation } from "@components/shared/Navigation";
import styles from "./page.module.scss";
import { SNS } from "@constants/url";
export default function Index() {
  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Hello, I&#39;m JJ.</h1>
      <ul className={styles.ul}>
        {SNS.map((sns, index) => (
          <li
            key={sns.label}
            className={styles.li}
            style={{
              animationDelay: `${index * 0.1 + 1.3}s`,
            }}
          >
            <a
              href={sns.href}
              target="_blank"
              rel="noreferrer"
              className={styles.a}
            >
              {sns.label}
            </a>
          </li>
        ))}
      </ul>

      <Navigation next={{ label: "About", href: "/about" }} />
    </div>
  );
}
