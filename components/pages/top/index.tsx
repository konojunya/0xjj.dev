import Iridescence from "@/components/shared/bits/Iridescence";
import { About } from "./about";
import { SNS } from "./sns";
import { Projects } from "./projects";
import { Layout } from "@/components/shared/Layout";

export default async function Top() {
  return (
    <Layout>
      <About />
      <SNS />
      <Projects />

      <div className="fixed top-0 left-0 w-screen h-screen -z-10">
        <div className="absolute top-0 left-0 w-full h-full bg-white/90 dark:bg-black/90" />
        <div className="absolute top-0 left-0 w-full h-screen -z-10">
          <Iridescence
            color={[1, 1, 1]}
            mouseReact={false}
            amplitude={0.1}
            speed={1.0}
          />
        </div>
      </div>
    </Layout>
  );
}
