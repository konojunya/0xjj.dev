import { KeyVisual } from "@/components/KeyVisual";

export const App: React.FC = () => {
  return (
    <main style={{ height: "calc(4 * 100vh)" }}>
      <div className="fixed left-0 top-0 z-0">
        <KeyVisual />
      </div>
      <div className="fixed left-0 top-0 z-10 w-screen">
        <section className="h-screen" />
        <section className="h-screen" />
        <section className="h-screen" />
        <section className="h-screen" />
      </div>
    </main>
  );
};
