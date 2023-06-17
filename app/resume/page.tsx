import { Navigation } from "@components/shared/Navigation";
import styles from "./page.module.scss";
import { HISTORY, SUB_HISTORY, TECH_STACK } from "@constants";
export default function Index() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <h1 className={styles.title}>Resume.</h1>

        <h2 className={styles.subtitle}>技術スタック</h2>
        <ul className={styles.ul}>
          {TECH_STACK.map((item, index) => (
            <li
              key={item}
              className={styles.techStackLi}
              style={{
                animationDelay: `${index * 0.1 + 1.3}s`,
              }}
            >
              {item}
            </li>
          ))}
        </ul>

        <h2 className={styles.subtitle}>職歴</h2>

        <ul className={styles.ul}>
          {HISTORY.map((history, index) => (
            <li
              key={history.name}
              className={styles.li}
              style={{
                animationDelay: `${index * 0.1 + 1.5}s`,
              }}
            >
              <p className={styles.historyName}>{history.name}</p>
              <p className={styles.historyJobTitle}>{history.jobTitle}</p>
              <p className={styles.historyDate}>{history.date}</p>
              <a
                href={history.url}
                target="_blank"
                rel="noreferrer"
                className={styles.historyCompanyUrl}
              >
                {history.url}
              </a>

              <ul className={styles.serviceUl}>
                {history.services.map((service) => (
                  <li key={service.title}>
                    <a
                      href={service.url}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.serviceUrl}
                    >
                      <img
                        className={styles.serviceImage}
                        src={service.image}
                        alt={service.title}
                        width={1200}
                        height={630}
                        decoding="async"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        <h2 className={styles.subtitle}>副業 / お手伝い</h2>
        <ul className={styles.sideServiceUl}>
          {SUB_HISTORY.map((service, index) => (
            <li
              key={service.title}
              className={styles.serviceLi}
              style={{
                animationDelay: `${index * 0.1 + 2}s`,
              }}
            >
              <a
                href={service.url}
                target="_blank"
                rel="noreferrer"
                className={styles.serviceUrl}
              >
                <img
                  className={styles.serviceImage}
                  src={service.image}
                  alt={service.title}
                  width={1200}
                  height={630}
                  decoding="async"
                />
              </a>
            </li>
          ))}
        </ul>
      </div>

      <Navigation prev={{ label: "About", href: "/about" }} />
    </div>
  );
}
