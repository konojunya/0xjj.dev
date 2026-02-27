import { createToolMetadata } from '../lib/metadata';
import Game2048 from './Game2048';

export const metadata = createToolMetadata('2048');

export default function Page() {
  return <Game2048 />;
}
