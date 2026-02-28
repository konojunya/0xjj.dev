import { createToolMetadata, createToolJsonLd } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import RegexTester from './RegexTester';

export const metadata = createToolMetadata('regex');

export default function Page() {
  trackView('regex');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('regex') }} />
      <RegexTester />
    </>
  );
}
