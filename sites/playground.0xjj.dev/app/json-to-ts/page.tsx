import { createToolMetadata, createToolJsonLd } from '../lib/metadata';
import { trackView } from '../lib/views';
import JsonToTs from './JsonToTs';

export const metadata = createToolMetadata('json-to-ts');

export default function Page() {
  trackView('json-to-ts');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('json-to-ts') }} />
      <JsonToTs />
    </>
  );
}
