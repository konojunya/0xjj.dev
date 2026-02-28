import { Suspense } from 'react';
import { createToolMetadata } from '../lib/metadata';
import OgpChecker from './OgpChecker';

export const metadata = createToolMetadata('ogpchecker');

export default function Page() {
  return (
    <Suspense>
      <OgpChecker />
    </Suspense>
  );
}
