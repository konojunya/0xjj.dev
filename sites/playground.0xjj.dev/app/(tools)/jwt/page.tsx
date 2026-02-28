import { createToolMetadata, createToolJsonLd } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import JwtDecoder from './JwtDecoder';

export const metadata = createToolMetadata('jwt');

export default function Page() {
  trackView('jwt');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('jwt') }} />
      <JwtDecoder />
    </>
  );
}
