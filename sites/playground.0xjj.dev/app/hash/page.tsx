import { createToolMetadata, createToolJsonLd } from '../lib/metadata';
import { trackView } from '../lib/views';
import HashCalculator from './HashCalculator';

export const metadata = createToolMetadata('hash');

export default function Page() {
  trackView('hash');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('hash') }} />
      <HashCalculator />
    </>
  );
}
