import { createToolMetadata, createToolJsonLd } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import HtmlEntity from './HtmlEntity';

export const metadata = createToolMetadata('html-entity');

export default function Page() {
  trackView('html-entity');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('html-entity') }} />
      <HtmlEntity />
    </>
  );
}
