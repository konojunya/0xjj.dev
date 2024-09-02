import { useEffect, useState } from "react";
import { throttle } from "throttle-debounce";
import { About } from "@/components/About";
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
      </div>

      <div
        className="relative left-0 top-0 z-10 mx-auto w-screen max-w-screen-sm"
        style={{ backdropFilter: `blur(${blurPixel}px)` }}
      >
        {/* key visual 用の箱 */}
        <div className="h-screen" />

        <About />
        <About />
        <About />
      </div>
    </main>
  );
};
