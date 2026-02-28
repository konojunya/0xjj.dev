import { createToolMetadata } from '../lib/metadata';
import { trackView } from '../lib/views';
import TicTacToe from './TicTacToe';

export const metadata = createToolMetadata('tictactoe');

export default function Page() {
  trackView('tictactoe');
  return <TicTacToe />;
}
