import { createToolMetadata, createToolJsonLd } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import WordWolf from './WordWolf';

export const metadata = createToolMetadata('wordwolf');

export default function Page() {
  trackView('wordwolf');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('wordwolf') }} />
      <WordWolf />
    </>
  );
}
