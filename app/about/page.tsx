import { Navigation } from "@components/shared/Navigation";
import styles from "./page.module.scss";
import { BASIC_INFO } from "@constants";
export default function Index() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <h1 className={styles.title}>About.</h1>

        <h2 className={styles.subtitle}>Me</h2>

        <ul className={styles.ul}>
          {BASIC_INFO.map((info, index) => (
            <li
              key={info.label}
              className={styles.li}
              style={{
                animationDelay: `${index * 0.1 + 1.3}s`,
              }}
            >
              <span>
                {info.label}
                <br />
                {info.value}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <Navigation
        prev={{ label: "Home", href: "/" }}
        next={{ label: "Resume", href: "/resume" }}
      />
    </div>
  );
}
