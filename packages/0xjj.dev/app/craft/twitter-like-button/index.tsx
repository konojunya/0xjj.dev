"use client";

import { useReducer } from "react";
import styles from "./index.module.scss";

export const TwitterLikeButton: React.FC = () => {
  const [liked, like] = useReducer((s) => !s, false);

  return (
    <div className={styles.wrapper}>
      <button className={styles.button} data-liked={liked} onClick={like} />
    </div>
  );
};
