import { createToolMetadata, createToolJsonLd } from '../lib/metadata';
import { trackView } from '../lib/views';
import GitignoreGenerator from './GitignoreGenerator';

export const metadata = createToolMetadata('gitignore');

export default function Page() {
  trackView('gitignore');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('gitignore') }} />
      <GitignoreGenerator />
    </>
  );
}
