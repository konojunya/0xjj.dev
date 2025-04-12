import FadeContent from "@/components/shared/bits/FadeContent";
import { About } from "./about";
import { SNS } from "./sns";
import { Projects } from "./projects";

export default async function Top() {
  return (
    <div>
      <About />

      <FadeContent
        blur
        duration={300}
        easing="ease-out"
        initialOpacity={0}
        delay={1700}
      >
        <SNS />
      </FadeContent>

      <FadeContent
        blur
        duration={300}
        easing="ease-out"
        initialOpacity={0}
        delay={2000}
      >
        <Projects />
      </FadeContent>
    </div>
  );
}
