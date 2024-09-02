/* eslint-disable react/no-unescaped-entities */
import { useEffect, useState } from "react";
import { Works } from "src/components/Works";
import { throttle } from "throttle-debounce";
import { About } from "@/components/About";
import { Contact } from "@/components/Contact";
import { KeyVisual } from "@/components/KeyVisual";

export const App: React.FC = () => {
  const [blurPixel, setBlurPixel] = useState(0);

  const handleScroll = throttle(100, () => {
    const scroll = window.scrollY;
    const documentHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    const scrollProgress = scroll / documentHeight;
    const progress = Math.floor(scrollProgress * 100);

    setBlurPixel(Math.min(20, progress));
  });

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  return (
    <main className="relative left-0 top-0">
      <div className="fixed left-0 top-0 z-0">
        <KeyVisual />
        <h1 className="sr-only">Hello, I'm JJ</h1>
      </div>

      <div
        className="relative left-0 top-0 z-10 mx-auto w-screen max-w-screen-2xl"
        style={{ backdropFilter: `blur(${blurPixel}px)` }}
      >
        {/* key visual 用の箱 */}
        <div className="h-screen" />

        <div className="lg:grid lg:grid-cols-3 lg:gap-1">
          <About />
          <Works />
          <Contact />
        </div>
      </div>
    </main>
  );
};
