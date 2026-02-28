import { createToolMetadata, createToolJsonLd } from '../lib/metadata';
import { trackView } from '../lib/views';
import RatioCalculator from './RatioCalculator';

export const metadata = createToolMetadata('ratio');

export default function Page() {
  trackView('ratio');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('ratio') }} />
      <RatioCalculator />
    </>
  );
}
