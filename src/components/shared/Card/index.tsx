import { memo } from "react";
import { GiSpades, GiHearts, GiClubs, GiDiamonds } from "react-icons/gi";

type Suit = "spades" | "hearts" | "diamonds" | "clubs";
type CardNumber =
  | "A"
  | "K"
  | "Q"
  | "J"
  | "10"
  | "9"
  | "8"
  | "7"
  | "6"
  | "5"
  | "4"
  | "3"
  | "2";

const suitToIcon = (suit: Suit) => {
  switch (suit) {
    case "spades": {
      return <GiSpades />;
    }
    case "hearts": {
      return <GiHearts />;
    }
    case "diamonds": {
      return <GiDiamonds />;
    }
    case "clubs": {
      return <GiClubs />;
    }
  }
};

interface Props {
  title: string;
  number: CardNumber;
  suit: Suit;
}

export const Card = memo(
  ({ title, number, suit, children }: React.PropsWithChildren<Props>) => {
    const suitColor =
      suit === "hearts" || suit === "diamonds" ? "red" : "black";

    return (
      <section
        className="relative h-screen w-full p-8 lg:h-fit"
      >
        <div
          className="absolute inset-8 z-10 rounded-xl"
        />
        <div className="h-full rounded-2xl bg-slate-50 px-10 py-20 text-black lg:h-[800px] lg:overflow-scroll">
          <div
            className="absolute left-12 top-12 flex flex-col items-center"
            style={{ color: suitColor }}
          >
            {number}
            {suitToIcon(suit)}
          </div>
          <div
            className="absolute bottom-12 right-12 flex -scale-y-100 scale-x-100 flex-col items-center"
            style={{ color: suitColor }}
          >
            {number}
            {suitToIcon(suit)}
          </div>

          <div className="relative z-20">
            <h2 className="text-xl leading-loose tracking-wide">{title}</h2>
            <div className="mt-4">{children}</div>
          </div>
        </div>
      </section>
    );
  },
);
