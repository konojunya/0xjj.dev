import { createToolJsonLd, createToolMetadata } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import { LSystemLab } from './LSystemLab';

export const metadata = createToolMetadata('l-system');

export default function Page() {
  trackView('l-system');

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: createToolJsonLd('l-system') }}
      />

      <div className="py-6">
        <div className="max-w-xl">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            L-System
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Lindenmayer systems are parallel rewriting grammars that produce
            fractal plant-like structures, space-filling curves, and other
            self-similar patterns through simple string-replacement rules and
            turtle graphics.
          </p>
        </div>

        <LSystemLab />
      </div>
    </>
  );
}
