import { createToolMetadata, createToolJsonLd } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import EasingVisualizer from './EasingVisualizer';

export const metadata = createToolMetadata('easing');

export default function Page() {
  trackView('easing');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('easing') }} />
      <EasingVisualizer />
    </>
  );
}
