export default function NotFound() {
  return (
    <main className="flex min-h-[80svh] items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-[clamp(6rem,20vw,12rem)] leading-none font-semibold tracking-tight opacity-12">
          404
        </h1>
        <p className="mt-2 font-mono text-sm text-muted tracking-wide">
          Page not found
        </p>
        <a
          href="/"
          className="mt-10 inline-block font-mono text-xs text-muted transition-colors hover:text-fg"
        >
          ← back
        </a>
      </div>
    </main>
  );
}
