import { createToolMetadata } from '../lib/metadata';
import { trackView } from '../lib/views';
import Base64Tool from './Base64Tool';

export const metadata = createToolMetadata('base64');

export default function Page() {
  trackView('base64');
  return <Base64Tool />;
}
