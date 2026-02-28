import { createToolMetadata, createToolJsonLd } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import DotsAndBoxes from './DotsAndBoxes';

export const metadata = createToolMetadata('dots-and-boxes');

export default function Page() {
  trackView('dots-and-boxes');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('dots-and-boxes') }} />
      <DotsAndBoxes />
    </>
  );
}
