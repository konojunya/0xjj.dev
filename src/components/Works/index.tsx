import { Card } from "@/components/shared/Card";

const jobs = [
  {
    title: "CTO",
    company: "microverse inc.",
    url: "https://microverse.co.jp",
  },
  {
    title: "Founder",
    company: "Poker Picks",
    url: "https://poker-picks.com",
  },
  { title: "Dev", company: "Argonauts inc.", url: "https://argonauts.design/" },
  { title: "Backend Dev", company: "UTAGE3.0", url: "https://utage3.com" },
  { title: "Web Dev", company: "Progate", url: "https://prog-8.com/" },
  {
    title: "Web Dev",
    company: "RENATUS ROBOTICS",
    url: "https://www.renatus-robotics.com/jp/",
  },
  {
    title: "Web Dev",
    company: "Crazy Raccoon GS",
    url: "https://cr-gs.jp/",
  },
  { title: "Web Advisor", company: "SORAJIMA", url: "https://sorajima.jp/" },
];

const exJobs = [
  { title: "Web Advisor", company: "Timee", url: "https://timee.co.jp/" },
  { title: "Tech Lead", company: "tricot inc.", url: "https://fujimi.me/" },
  {
    title: "Web Dev",
    company: "CyberAgent inc.",
    url: "https://www.cyberagent.co.jp/",
  },
];

export const Works: React.FC = () => {
  return (
    <Card number="J" suit="hearts">
      <h2 className="text-xl leading-loose tracking-wide">Works.</h2>
      <div className="mt-4 flex flex-col gap-8">
        <div className="flex flex-col gap-2 text-sm lg:text-lg">
          {jobs.map((job) => (
            <dl className="flex gap-4" key={job.company}>
              <dt>{job.title}</dt>
              <dd>
                @
                <a
                  href={job.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {job.company}
                </a>
              </dd>
            </dl>
          ))}
        </div>

        <div className="flex flex-col gap-2 text-sm lg:text-lg">
          {exJobs.map((job) => (
            <dl className="flex gap-4" key={job.company}>
              <dt>ex-{job.title}</dt>
              <dd>
                @
                <a
                  href={job.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {job.company}
                </a>
              </dd>
            </dl>
          ))}
        </div>

        <span className="text-sm lg:text-lg">etc...</span>
      </div>
    </Card>
  );
};
