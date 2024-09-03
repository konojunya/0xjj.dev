/* eslint-disable react/no-unescaped-entities */
import { Works } from "src/components/Works";
import { About } from "@/components/About";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { KeyVisual } from "@/components/KeyVisual";

export const App: React.FC = () => {
  return (
    <main className="relative left-0 top-0 h-screen">
      <div className="fixed left-0 top-0 z-0">
        <KeyVisual />
        <h1 className="sr-only">Hello, I'm JJ</h1>
      </div>

      <div className="relative left-0 top-0 z-10 mx-auto w-screen max-w-screen-2xl">
        {/* key visual 用の箱 */}
        <div className="h-screen" />

        <div className="lg:grid lg:grid-cols-3 lg:gap-1">
          <About />
          <Works />
          <Contact />
        </div>
      </div>

      <Footer />
    </main>
  );
};
