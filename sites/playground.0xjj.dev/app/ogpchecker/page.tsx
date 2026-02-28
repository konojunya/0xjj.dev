import { Suspense } from 'react';
import { createToolMetadata, createToolJsonLd } from '../lib/metadata';
import { trackView } from '../lib/views';
import OgpChecker from './OgpChecker';

export const metadata = createToolMetadata('ogpchecker');

export default function Page() {
  trackView('ogpchecker');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('ogpchecker') }} />
      <Suspense>
        <OgpChecker />
      </Suspense>
    </>
  );
}
