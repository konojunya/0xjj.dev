import { jst } from "@/lib/date";
import Image from "next/image";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      MICROCMS_ENDPOINT: string;
      MICROCMS_API_KEY: string;
    }
  }
}

interface Project {
  id: string;
  organization: string;
  jobTitle: string;
  joinedAt: string;
  leftAt?: string;
  sites?: {
    title: string;
    url: string;
    image?: {
      url: string;
      width: number;
      height: number;
    };
  }[];
}

async function getProjects() {
  const res = await fetch(`${process.env.MICROCMS_ENDPOINT}?limit=20`, {
    headers: {
      "X-MICROCMS-API-KEY": process.env.MICROCMS_API_KEY,
    },
    next: { tags: ["jobs"] },
  });

  return (await res.json()) as { contents: Project[] };
}

export const Projects: React.FC = async () => {
  const projects = await getProjects();

  console.log(projects.contents);

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-bold">Projects</h2>
      <ul className="grid grid-cols-1 gap-6 mt-4">
        {projects.contents.map((p) => (
          <li key={p.id}>
            <h3 className="font-bold text-lg">{p.organization}</h3>
            <div className="flex justify-between items-center">
              <p className="text-base">{p.jobTitle}</p>
              <span className="flex items-center gap-1">
                <time
                  className="text-sm"
                  dateTime={jst(p.joinedAt).format("YYYY-MM-DD")}
                >
                  {jst(p.joinedAt).format("YYYY/MM")}
                </time>
                <span>~</span>
                <span className="text-sm">
                  {p.leftAt ? jst(p.leftAt).format("YYYY/MM") : "Present"}
                </span>
              </span>
            </div>
            <ul className="flex gap-2 mt-2 overflow-x-scroll w-full flex-nowrap snap-x snap-mandatory">
              {p.sites?.map((site) => (
                <li
                  key={site.title}
                  className="w-2/3 min-w-2/3 snap-center lg:w-1/4 lg:min-w-1/4"
                >
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full block min-h-10"
                  >
                    {site.image ? (
                      <Image
                        src={`${site.image.url}?w=600&fm=webp`}
                        alt=""
                        width={site.image.width}
                        height={site.image.height}
                        className="w-full h-full object-cover aspect-[1200/630] rounded-md"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center aspect-[1200/630] bg-foreground/10 rounded-md">
                        <p className="text-sm font-bold p-4">{site.title}</p>
                      </div>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
};
