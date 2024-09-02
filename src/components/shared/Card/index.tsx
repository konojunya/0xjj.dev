import { memo, useEffect, useRef, useState } from "react";
import { useMotionValue, useTransform, motion } from "framer-motion";
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
  number: CardNumber;
  suit: Suit;
}

export const Card = memo(
  ({ number, suit, children }: React.PropsWithChildren<Props>) => {
    const suitColor =
      suit === "hearts" || suit === "diamonds" ? "red" : "black";

    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [-100, 100], [20, -20]);
    const rotateY = useTransform(x, [-100, 100], [-20, 20]);
    const ref = useRef<HTMLDivElement>(null);
    const [handling, setHandling] = useState(false);

    const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (
      event,
    ) => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      const xPercent = (event.clientX - rect.left) / rect.width;
      const yPercent = (event.clientY - rect.top) / rect.height;
      x.set((xPercent - 0.5) * 200); // 画面の中央からのオフセットを計算
      y.set((yPercent - 0.5) * 200);
      setHandling(true);
    };
    const handleTouchMove: React.TouchEventHandler<HTMLDivElement> = (
      event,
    ) => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      const touch = event.touches[0];
      const xPercent = (touch.clientX - rect.left) / rect.width;
      const yPercent = (touch.clientY - rect.top) / rect.height;
      x.set((xPercent - 0.5) * 200);
      y.set((yPercent - 0.5) * 200);
      setHandling(true);
    };
    const handleLeave = () => {
      x.set(0);
      y.set(0);
      setHandling(false);
    };

    const glareRef = useRef<HTMLDivElement>(null);
    const glareAngle = useTransform([x, y], ([latestX, latestY]: number[]) => {
      return 90 + Math.atan2(latestY, latestX) * (180 / Math.PI);
    });
    const glareOpacity = useTransform([x, y], ([xVal, yVal]: number[]) => {
      const maxOffset = Math.hypot(xVal, yVal) / 200; // Normalize based on expected max tilt values
      return Math.min(maxOffset, 1); // Clamp the value between 0 and 1
    });

    useEffect(() => {
      const unsubscribeX = x.on("change", () => {
        if (glareRef.current) {
          glareRef.current.style.background = `linear-gradient(${glareAngle.get()}deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.75) 50%, rgba(255,255,255,0) 100%)`;
          glareRef.current.style.opacity = glareOpacity.get().toString();
        }
      });
      const unsubscribeY = y.on("change", () => {
        if (glareRef.current) {
          glareRef.current.style.background = `linear-gradient(${glareAngle.get()}deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.75) 50%, rgba(255,255,255,0) 100%)`;
          glareRef.current.style.opacity = glareOpacity.get().toString();
        }
      });

      return () => {
        unsubscribeX();
        unsubscribeY();
      };
    }, [glareAngle, glareOpacity, x, y]);

    return (
      <motion.section
        className="relative h-screen w-full p-8 lg:h-fit"
        ref={ref}
        style={{
          rotateX,
          rotateY,
        }}
        drag={false}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleLeave}
      >
        <motion.div
          ref={glareRef}
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

          <div className="relative" style={{ zIndex: handling ? 0 : 20 }}>
            {children}
          </div>
        </div>
      </motion.section>
    );
  },
);
