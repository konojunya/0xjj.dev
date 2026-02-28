import { createToolMetadata, createToolJsonLd } from '../lib/metadata';
import { trackView } from '../lib/views';
import GrpcStatus from './GrpcStatus';

export const metadata = createToolMetadata('grpc-status');

export default function Page() {
  trackView('grpc-status');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('grpc-status') }} />
      <GrpcStatus />
    </>
  );
}
