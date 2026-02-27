import { createToolMetadata } from '../lib/metadata';
import DotsAndBoxes from './DotsAndBoxes';

export const metadata = createToolMetadata('dots-and-boxes');

export default function Page() {
  return <DotsAndBoxes />;
}
