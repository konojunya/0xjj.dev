import { createToolMetadata, createToolJsonLd } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import Unicode from './Unicode';

export const metadata = createToolMetadata('unicode');

export default function Page() {
  trackView('unicode');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('unicode') }} />
      <Unicode />
    </>
  );
}
