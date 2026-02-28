import { createToolMetadata, createToolJsonLd } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import Base64Tool from './Base64Tool';

export const metadata = createToolMetadata('base64');

export default function Page() {
  trackView('base64');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('base64') }} />
      <Base64Tool />
    </>
  );
}
