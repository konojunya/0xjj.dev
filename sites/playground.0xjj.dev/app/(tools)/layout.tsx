export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="px-4 pt-8 sm:pt-10">
        <div className="mx-auto max-w-5xl">
          <a
            href="/"
            className="inline-block font-mono text-xs text-muted transition-colors hover:text-fg"
          >
            ← back
          </a>
        </div>
      </nav>
      {children}
    </>
  );
}
