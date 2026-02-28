import { createToolMetadata } from '../lib/metadata';
import { trackView } from '../lib/views';
import Reversi from './Reversi';

export const metadata = createToolMetadata('reversi');

export default function Page() {
  trackView('reversi');
  return <Reversi />;
}
