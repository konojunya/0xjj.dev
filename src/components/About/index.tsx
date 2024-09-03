/* eslint-disable react/no-unescaped-entities */

import { Card } from "@/components/shared/Card";

export const About: React.FC = () => {
  return (
    <Card number="A" suit="spades" title="about me.">
      <div className="flex flex-col gap-4 text-sm leading-loose tracking-wide lg:text-lg">
        <p>I'm a software developer and also work as a technical advisor.</p>
        <p>My hobbies include traveling, poker, mahjong, and tattoos.</p>
        <p>
          I love going to Disneyland, but if I were to go, it would be in the
          winter. Even though it's cold, I can wear my favorite clothes, and
          there's lots of good food. My favorite character is Elsa from
          "Frozen."
        </p>
      </div>
    </Card>
  );
};
