import styles from "./page.module.scss";
import { MAIN_JOB, SIDE_JOB, TECH_STACK, SPEAKER } from "@constants";
import Image from "next/image";
export default function Index() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <h1 className={styles.title}>Resume.</h1>

        <h2 className={styles.subtitle}>Love</h2>
        <ul className={styles.ul}>
          {TECH_STACK.map((item, index) => (
            <li
              key={item.label}
              className={styles.techStackLi}
              style={{
                animationDelay: `${index * 0.1 + 1.3}s`,
              }}
            >
              {item.label}({item.date})
            </li>
          ))}
        </ul>

        <h2 className={styles.subtitle}>Main Job</h2>

        <ul className={styles.ul}>
          {MAIN_JOB.map((history, index) => (
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
                      <Image
                        className={styles.ogpImage}
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

        <h2 className={styles.subtitle}>Side Job</h2>
        <ul className={styles.sideServiceUl}>
          {SIDE_JOB.map((service, index) => (
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
                <Image
                  className={styles.ogpImage}
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

        <h2 className={styles.subtitle}>Speaker</h2>
        <ul className={styles.speakerUl}>
          {SPEAKER.map((speaker, index) => (
            <li
              key={speaker.title}
              className={styles.speakerLi}
              style={{
                animationDelay: `${index * 0.1 + 2.5}s`,
              }}
            >
              <a
                href={speaker.href}
                target="_blank"
                rel="noreferrer"
                className={styles.speakerUrl}
              >
                <Image
                  className={styles.ogpImage}
                  src={speaker.image}
                  alt={speaker.title}
                  width={1200}
                  height={630}
                  decoding="async"
                />
                <span className={styles.speakerTitle}>{speaker.title}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
