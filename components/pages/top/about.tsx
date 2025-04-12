"use client";

import type React from "react";
import { useState, useEffect } from "react";

const description = `
I'm a software engineer based in Tokyo, Japan.\n
I work at the intersection of technology and culture, creating interactive experiences that often involve entertainment, design, and web innovation. I enjoy building tools, experimenting with new ideas, and collaborating with creators from various fields.\n
Outside of work, I spend time exploring Tokyo, playing poker or mahjong, and working on side projects.\n
This is an AI-written overview of JJ.
`;

export const About: React.FC = () => {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    let currentText = "";
    let index = 0;

    const typeNextChar = () => {
      if (index < description.length) {
        currentText += description.charAt(index);
        setDisplayText(currentText);
        index++;

        // next char delay (10-20ms)
        const randomDelay = Math.floor(Math.random() * 21) + 10;
        setTimeout(typeNextChar, randomDelay);
      }
    };

    typeNextChar();
  }, []);

  return (
    <section className="min-h-90">
      <h2 className="sr-only">About Me</h2>
      <div className="flex flex-col gap-4">
        <p className="whitespace-pre-wrap lg:text-lg">{displayText}</p>
      </div>
    </section>
  );
};
