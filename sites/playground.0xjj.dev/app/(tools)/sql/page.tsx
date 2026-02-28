import { createToolMetadata, createToolJsonLd } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import SqlFormatter from './SqlFormatter';

export const metadata = createToolMetadata('sql');

export default function Page() {
  trackView('sql');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('sql') }} />
      <SqlFormatter />
    </>
  );
}
