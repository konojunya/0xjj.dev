import FuzzyText from "@/components/shared/bits/FuzzyText";
import Link from "next/link";

export const NotFound: React.FC = () => {
  return (
    <Link href="/" className="flex flex-col items-center justify-center h-screen w-screen">
      <FuzzyText baseIntensity={0.2} hoverIntensity={0.5} enableHover>
        404 Not Found
      </FuzzyText>
    </Link>
  );
};
