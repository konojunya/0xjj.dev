"use client";

import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import DecryptedText from "@/components/shared/bits/DecryptedText";
import Link from "next/link";
import { AI } from "./AI";

export const Header: React.FC = () => {
  const { setTheme } = useTheme();

  const handleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

    // MEMO: clear theme setting in localStorage for next page load
    localStorage.removeItem("0xjj-dev-theme");
  };

  return (
    <header className="sticky top-0 z-10 backdrop-blur-sm py-4 lg:py-8">
      <div className="container flex justify-between items-center">
        <Link href="/">
          <h1 className="font-bold text-3xl">
            <DecryptedText
              text="Hello, I'm JJ"
              animateOn="view"
              revealDirection="center"
              maxIterations={10}
            />
          </h1>
        </Link>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={handleTheme}>
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          <AI />
        </div>
      </div>
    </header>
  );
};
