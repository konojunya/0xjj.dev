import styles from "./page.module.scss";

// crafts
import { TwitterLikeButton } from "./twitter-like-button";

const Crafts = [
  {
    id: "twitter-like-button",
    component: <TwitterLikeButton />,
  },
];
export default function Index() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <h1 className={styles.title}>Craft.</h1>
      </div>

      <ul className={styles.ul}>
        {Crafts.map((item) => (
          <li key={item.id} className={styles.li}>
            {item.component}
          </li>
        ))}
      </ul>
    </div>
  );
}
