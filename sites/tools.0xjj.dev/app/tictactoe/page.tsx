import type { Metadata } from 'next';
import { tools } from '../lib/tools';
import TicTacToe from './TicTacToe';

const tool = tools.find((t) => t.slug === 'tictactoe')!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

export default function Page() {
  return <TicTacToe />;
}
