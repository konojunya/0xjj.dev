import { createToolMetadata, createToolJsonLd } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import OgpBgGenerator from './OgpBgGenerator';

export const metadata = createToolMetadata('ogp-bg');

export default function Page() {
  trackView('ogp-bg');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('ogp-bg') }} />
      <OgpBgGenerator />
    </>
  );
}
