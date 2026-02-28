import { createToolMetadata, createToolJsonLd } from '../lib/metadata';
import { trackView } from '../lib/views';
import BaseConverter from './BaseConverter';

export const metadata = createToolMetadata('base');

export default function Page() {
  trackView('base');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('base') }} />
      <BaseConverter />
    </>
  );
}
