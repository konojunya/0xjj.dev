import { createToolMetadata } from '../lib/metadata';
import { trackView } from '../lib/views';
import BaseConverter from './BaseConverter';

export const metadata = createToolMetadata('base');

export default function Page() {
  trackView('base');
  return <BaseConverter />;
}
