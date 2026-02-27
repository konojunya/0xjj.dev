import { createToolMetadata } from '../lib/metadata';
import WordWolf from './WordWolf';

export const metadata = createToolMetadata('wordwolf');

export default function Page() {
  return <WordWolf />;
}
