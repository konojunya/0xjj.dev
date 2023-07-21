import { compileMarkdown } from "@utils/MarkdownUtils";
import styles from "./JobDescription.module.scss";

interface Props {
  markdown: string;
}

export const JobDescription = async ({ markdown }: Props) => {
  const html = await compileMarkdown(markdown);

  return (
    <div
      className={styles.wrapper}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
