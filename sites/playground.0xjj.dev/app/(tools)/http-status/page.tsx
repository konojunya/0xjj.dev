import { createToolMetadata, createToolJsonLd } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import HttpStatus from './HttpStatus';

export const metadata = createToolMetadata('http-status');

export default function Page() {
  trackView('http-status');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('http-status') }} />
      <HttpStatus />
    </>
  );
}
