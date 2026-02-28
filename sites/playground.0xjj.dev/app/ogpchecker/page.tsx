import { Suspense } from 'react';
import { createToolMetadata } from '../lib/metadata';
import { trackView } from '../lib/views';
import OgpChecker from './OgpChecker';

export const metadata = createToolMetadata('ogpchecker');

export default function Page() {
  trackView('ogpchecker');
  return (
    <Suspense>
      <OgpChecker />
    </Suspense>
  );
}
