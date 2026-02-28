import { createToolMetadata, createToolJsonLd } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import Game2048 from './Game2048';

export const metadata = createToolMetadata('2048');

export default function Page() {
  trackView('2048');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('2048') }} />
      <Game2048 />
    </>
  );
}
