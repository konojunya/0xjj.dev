import { createToolMetadata } from '../lib/metadata';
import HashCalculator from './HashCalculator';

export const metadata = createToolMetadata('hash');

export default function Page() {
  return <HashCalculator />;
}
