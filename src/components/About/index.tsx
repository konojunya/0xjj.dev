/* eslint-disable react/no-unescaped-entities */

import { Card } from "@/components/shared/Card";

export const About: React.FC = () => {
  return (
    <Card number="A" suit="spades">
      <h2 className="text-xl leading-loose tracking-wide">about me.</h2>
      <div className="mt-4 flex flex-col gap-4 leading-loose tracking-wide">
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
