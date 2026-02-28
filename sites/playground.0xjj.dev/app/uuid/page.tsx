import { createToolMetadata } from '../lib/metadata';
import { trackView } from '../lib/views';
import UuidGenerator from './UuidGenerator';

export const metadata = createToolMetadata('uuid');

export default function Page() {
  trackView('uuid');
  return <UuidGenerator />;
}
