import { createToolMetadata, createToolJsonLd } from '../lib/metadata';
import { trackView } from '../lib/views';
import Reversi from './Reversi';

export const metadata = createToolMetadata('reversi');

export default function Page() {
  trackView('reversi');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('reversi') }} />
      <Reversi />
    </>
  );
}
