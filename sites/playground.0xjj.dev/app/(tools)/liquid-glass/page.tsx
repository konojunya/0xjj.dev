import { createToolMetadata, createToolJsonLd } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import Article from '../../lib/Article';
import Demo from './Demo';
import En from './en.mdx';
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
          Drag the capsule to bend the page. SVG displacement filter refracts whatever sits beneath it.
        </p>
        <p className="mt-2 rounded bg-yellow-500/10 px-3 py-1.5 text-xs text-yellow-600 dark:text-yellow-400">
          Requires Chrome / Edge. backdrop-filter + SVG filter is not supported in Firefox / Safari.
        </p>

        <Demo />

        <Article en={<En />} ja={<Ja />} />
      </div>
    </>
  );
}
