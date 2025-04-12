import { Header } from "@/components/shared/Header";
import SplashCursor from "@/components/shared/bits/SplashCursor";

export const Layout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <div>
      <Header />
      <main className="container my-4">{children}</main>

      <SplashCursor />
    </div>
  );
};
