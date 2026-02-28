import { createToolMetadata, createToolJsonLd } from '../lib/metadata';
import { trackView } from '../lib/views';
import CaseConverter from './CaseConverter';

export const metadata = createToolMetadata('case');

export default function Page() {
  trackView('case');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('case') }} />
      <CaseConverter />
    </>
  );
}
