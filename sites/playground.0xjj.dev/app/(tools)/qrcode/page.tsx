import { createToolMetadata, createToolJsonLd } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import QrCode from './QrCode';

export const metadata = createToolMetadata('qrcode');

export default function Page() {
  trackView('qrcode');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('qrcode') }} />
      <QrCode />
    </>
  );
}
