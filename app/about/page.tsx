import styles from "./page.module.scss";
import { BASIC_INFO, HOBBY } from "@constants";
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

        <h2 className={styles.subtitle}>Hobby</h2>

        <ul className={styles.ul}>
          {HOBBY.map((hobby, index) => (
            <li
              key={hobby}
              className={styles.li}
              style={{
                animationDelay: `${index * 0.1 + 1.3}s`,
              }}
            >
              {hobby}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
