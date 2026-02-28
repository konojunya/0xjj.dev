import { createToolMetadata } from '../lib/metadata';
import { trackView } from '../lib/views';
import DotsAndBoxes from './DotsAndBoxes';

export const metadata = createToolMetadata('dots-and-boxes');

export default function Page() {
  trackView('dots-and-boxes');
  return <DotsAndBoxes />;
}
