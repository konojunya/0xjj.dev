import { createToolMetadata } from '../lib/metadata';
import ColorConverter from './ColorConverter';

export const metadata = createToolMetadata('color');

export default function Page() {
  return <ColorConverter />;
}
