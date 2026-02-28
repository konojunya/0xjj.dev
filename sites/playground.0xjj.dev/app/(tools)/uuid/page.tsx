import { createToolMetadata, createToolJsonLd } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import UuidGenerator from './UuidGenerator';

export const metadata = createToolMetadata('uuid');

export default function Page() {
  trackView('uuid');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('uuid') }} />
      <UuidGenerator />
    </>
  );
}
