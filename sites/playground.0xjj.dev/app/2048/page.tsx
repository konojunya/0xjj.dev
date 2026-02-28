import { createToolMetadata } from '../lib/metadata';
import { trackView } from '../lib/views';
import Game2048 from './Game2048';

export const metadata = createToolMetadata('2048');

export default function Page() {
  trackView('2048');
  return <Game2048 />;
}
