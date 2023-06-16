import Link from "next/link";
import styles from "./index.module.scss";

interface LinkProps {
  label: string;
  href: string;
}

interface Props {
  prev?: LinkProps;
  next?: LinkProps;
}

export const Navigation: React.FC<Props> = ({ prev, next }) => {
  return (
    <nav className={styles.nav}>
      <ul className={styles.ul}>
        <li>
          {prev != null && (
            <Link href={prev.href} className={styles.link}>
              <svg
                className={styles.svg}
                stroke="currentColor"
                strokeWidth={0}
                viewBox="0 0 1024 1024"
                height="24px"
                width="24px"
              >
                <path
                  aria-hidden="true"
                  d="M872 572H266.8l144.3-183c4.1-5.2.4-13-6.3-13H340c-9.8 0-19.1 4.5-25.1 12.2l-164 208c-16.5 21-1.6 51.8 25.1 51.8h696c4.4 0 8-3.6 8-8v-60c0-4.4-3.6-8-8-8z"
                  stroke="none"
                />
              </svg>
              {prev.label}
            </Link>
          )}
        </li>
        <li>
          {next != null && (
            <Link href={next.href} className={styles.link}>
              {next.label}
              <svg
                className={styles.svg}
                stroke="currentColor"
                strokeWidth={0}
                viewBox="0 0 1024 1024"
                height="24px"
                width="24px"
              >
                <path
                  aria-hidden="true"
                  d="M873.1 596.2l-164-208A32 32 0 0 0 684 376h-64.8c-6.7 0-10.4 7.7-6.3 13l144.3 183H152c-4.4 0-8 3.6-8 8v60c0 4.4 3.6 8 8 8h695.9c26.8 0 41.7-30.8 25.2-51.8z"
                  stroke="none"
                />
              </svg>
            </Link>
          )}
        </li>
      </ul>
    </nav>
  );
};
