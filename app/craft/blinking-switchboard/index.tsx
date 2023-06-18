"use client";

import styles from "./index.module.scss";
import { useEffect, useRef } from "react";

function getRandomNumber(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export const BlinkingSwitchboard: React.FC = () => {
  const rows = 15;
  const columns = 18;
  const transitionDuration = 250;
  const lightCount = 40;
  const indices: number[] = [];
  for (let i = 0; i < lightCount; i++) {
    indices.push(Math.floor(getRandomNumber(0, rows * columns)));
  }
  const states = ["off", "medium", "high"];

  const ref = useRef(null);

  useEffect(() => {
    const timeoutIds: NodeJS.Timeout[] = [];

    const interval = setInterval(() => {
      for (const index of indices) {
        // FIXME: This is a hack to get around the fact that the ref is null
        const div = ref?.current as unknown as HTMLDivElement;
        const light = div.querySelector(
          `[data-index="${index}"]`
        ) as HTMLElement;
        if (!light) return;

        const nextState = states[Math.floor(Math.random() * states.length)];
        const currentState = light.dataset.state;

        const pulse =
          Math.random() > 0.2 &&
          ((currentState === "off" && nextState === "high") ||
            (currentState === "off" && nextState === "medium") ||
            (currentState === "medium" && nextState === "high"));

        if (pulse) {
          const delay = Math.random() * (500 - 100) + 100;

          timeoutIds.push(
            setTimeout(() => {
              light.style.transform = "scale(2)";
            }, delay)
          );

          timeoutIds.push(
            setTimeout(() => {
              light.style.transform = "scale(1)";
            }, transitionDuration + delay)
          );
        }

        if (currentState === "high" && nextState === "medium" && pulse) {
          light.dataset.state = "off";
        } else {
          light.dataset.state = nextState;
        }
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      timeoutIds.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className={styles.wrapper}>
      <div
        ref={ref}
        style={{
          display: "grid",
          gap: `${columns}px`,
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
        }}
      >
        {Array.from({ length: columns * rows }).map((_, index) => {
          return (
            <div
              key={`lightblinking-switchboard-index-${index}`}
              className={styles.light}
              data-state="off"
              data-index={index}
              style={
                {
                  "--transition-duration": `${transitionDuration}ms`,
                } as unknown as React.CSSProperties
              }
            />
          );
        })}
      </div>
    </div>
  );
};
