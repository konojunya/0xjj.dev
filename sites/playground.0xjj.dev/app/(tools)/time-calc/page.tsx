import { createToolMetadata, createToolJsonLd } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import TimeCalc from './TimeCalc';

export const metadata = createToolMetadata('time-calc');

export default function Page() {
  trackView('time-calc');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('time-calc') }} />
      <TimeCalc />
    </>
  );
}
