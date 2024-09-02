import { Card } from "@/components/shared/Card";

export const Contact: React.FC = () => {
  return (
    <Card number="K" suit="clubs">
      <h2 className="text-xl leading-loose tracking-wide">Contact.</h2>
      <div className="mt-4 flex flex-col gap-4 leading-loose tracking-wide lg:text-lg">
        <p>
          Contacting me on{" "}
          <a
            href="https://x.com/0xjj_official"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            X
          </a>
          , which I update almost daily, is the best way to reach me. I often
          upload daily updates to{" "}
          <a
            href="https://www.instagram.com/0xjj_official"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Instagram Stories
          </a>
          , so please check there as well. For my developer account, please
          refer to{" "}
          <a
            href="https://github.com/konojunya"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            GitHub
          </a>
          . I also have several tech articles on{" "}
          <a
            href="https://zenn.dev/jj"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Zenn
          </a>
          .
        </p>
      </div>
    </Card>
  );
};
