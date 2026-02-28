import { createToolMetadata } from '../lib/metadata';
import { trackView } from '../lib/views';
import HashCalculator from './HashCalculator';

export const metadata = createToolMetadata('hash');

export default function Page() {
  trackView('hash');
  return <HashCalculator />;
}
