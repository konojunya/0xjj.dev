import { createToolMetadata } from '../lib/metadata';
import TicTacToe from './TicTacToe';

export const metadata = createToolMetadata('tictactoe');

export default function Page() {
  return <TicTacToe />;
}
