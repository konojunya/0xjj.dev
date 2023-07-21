import styles from "./index.module.scss";

const lines = [
  { "--fade": "10%" },
  { "--fade": "50%" },
  { "--fade": "90%" },
  { "--fade": "50%" },
  { "--fade": "10%" },
  { "--fade": "50%" },
  { "--fade": "90%" },
  { "--fade": "50%" },
  { "--fade": "10%" },
] as unknown as React.CSSProperties[];

export const DashedLine: React.FC = () => {
  return (
    <div className={styles.wrapper}>
      {lines.map((line, index) => (
        <div
          key={`dashedline-${index}`}
          className={styles.dashedLine}
          style={line}
        />
      ))}
    </div>
  );
};
