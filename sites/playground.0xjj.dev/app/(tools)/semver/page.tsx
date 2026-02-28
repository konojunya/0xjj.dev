import { createToolMetadata, createToolJsonLd } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import Semver from './Semver';

export const metadata = createToolMetadata('semver');

export default function Page() {
  trackView('semver');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('semver') }} />
      <Semver />
    </>
  );
}
