import { createToolMetadata, createToolJsonLd } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import CssSpecificity from './CssSpecificity';

export const metadata = createToolMetadata('css-specificity');

export default function Page() {
  trackView('css-specificity');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('css-specificity') }} />
      <CssSpecificity />
    </>
  );
}
