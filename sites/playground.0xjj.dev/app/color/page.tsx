import { createToolMetadata } from '../lib/metadata';
import { trackView } from '../lib/views';
import ColorConverter from './ColorConverter';

export const metadata = createToolMetadata('color');

export default function Page() {
  trackView('color');
  return <ColorConverter />;
}
