import { Suspense } from 'react';
import { createToolMetadata, createToolJsonLd } from '../lib/metadata';
import { trackView } from '../lib/views';
import UrlInspector from './UrlInspector';

export const metadata = createToolMetadata('httpinspector');

export default function Page() {
  trackView('httpinspector');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('httpinspector') }} />
      <Suspense>
        <UrlInspector />
      </Suspense>
    </>
  );
}
