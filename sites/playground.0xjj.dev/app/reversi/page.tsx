import { createToolMetadata } from '../lib/metadata';
import Reversi from './Reversi';

export const metadata = createToolMetadata('reversi');

export default function Page() {
  return <Reversi />;
}
