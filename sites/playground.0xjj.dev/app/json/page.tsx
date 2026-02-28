import { createToolMetadata, createToolJsonLd } from '../lib/metadata';
import { trackView } from '../lib/views';
import JsonFormatter from './JsonFormatter';

export const metadata = createToolMetadata('json');

export default function Page() {
  trackView('json');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('json') }} />
      <JsonFormatter />
    </>
  );
}
