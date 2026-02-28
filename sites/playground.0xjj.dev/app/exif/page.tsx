import { createToolMetadata, createToolJsonLd } from '../lib/metadata';
import { trackView } from '../lib/views';
import ExifViewer from './ExifViewer';

export const metadata = createToolMetadata('exif');

export default function Page() {
  trackView('exif');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('exif') }} />
      <ExifViewer />
    </>
  );
}
