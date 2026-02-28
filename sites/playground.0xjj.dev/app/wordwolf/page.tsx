import { createToolMetadata } from '../lib/metadata';
import { trackView } from '../lib/views';
import WordWolf from './WordWolf';

export const metadata = createToolMetadata('wordwolf');

export default function Page() {
  trackView('wordwolf');
  return <WordWolf />;
}
