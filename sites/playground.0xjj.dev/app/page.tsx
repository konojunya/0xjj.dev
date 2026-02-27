import ToolGrid from './ToolGrid';

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-14">
      <div className="mb-12">
        <h1 className="text-3xl font-semibold tracking-tight text-fg">playground.0xjj.dev</h1>
        <p className="mt-2 text-sm text-muted">Tools, games & experiments.</p>
      </div>

      <ToolGrid />
    </main>
  );
}
