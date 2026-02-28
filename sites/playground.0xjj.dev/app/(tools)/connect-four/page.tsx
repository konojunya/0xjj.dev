import { createToolMetadata, createToolJsonLd } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import ConnectFour from './ConnectFour';

export const metadata = createToolMetadata('connect-four');

export default function Page() {
  trackView('connect-four');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('connect-four') }} />
      <ConnectFour />
    </>
  );
}
