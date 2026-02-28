import { createToolMetadata, createToolJsonLd } from '../lib/metadata';
import { trackView } from '../lib/views';
import TicTacToe from './TicTacToe';

export const metadata = createToolMetadata('tictactoe');

export default function Page() {
  trackView('tictactoe');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('tictactoe') }} />
      <TicTacToe />
    </>
  );
}
