import styles from "./page.module.scss";
export default function Index() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <div />
        <div className={styles.HDashedLine} style={{ top: "0px" }} />
        <div className={styles.HDashedLine} style={{ bottom: "0px" }} />
        <div
          className={styles.VDashedLine}
          style={{ right: "calc(50% - 35px)" }}
        />
        <div
          className={styles.VDashedLine}
          style={{ left: "calc(-50% + 30px)" }}
        />

        <h1 className={styles.title}>
          Hello, <br />
          I&#39;m JJ.
        </h1>
      </div>
    </div>
  );
}
