import { createToolMetadata, createToolJsonLd } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import '../../lib/prose.css';
import Demo from './Demo';
import Ja from './ja.mdx';

export const metadata = createToolMetadata('liquid-glass');

export default function Page() {
  trackView('liquid-glass');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('liquid-glass') }} />
      <div className="py-6">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Liquid Glass</h1>
        <p className="mt-1 text-sm text-muted">
          カプセルをドラッグしてページを歪ませます。SVGディスプレイスメントフィルターが背後の要素を屈折させます。
        </p>
        <p className="mt-2 rounded bg-yellow-500/10 px-3 py-1.5 text-xs text-yellow-600 dark:text-yellow-400">
          Chrome / Edge が必要です。backdrop-filter + SVGフィルターは Firefox / Safari では未対応です。
        </p>

        <Demo />

        <article className="prose mt-12 max-w-3xl">
          <Ja />
        </article>
      </div>
    </>
  );
}
