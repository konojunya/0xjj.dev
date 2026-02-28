import { createToolMetadata } from '../lib/metadata';
import { trackView } from '../lib/views';
import JsonFormatter from './JsonFormatter';

export const metadata = createToolMetadata('json');

export default function Page() {
  trackView('json');
  return <JsonFormatter />;
}
