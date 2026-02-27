import { createToolMetadata } from '../lib/metadata';
import JsonFormatter from './JsonFormatter';

export const metadata = createToolMetadata('json');

export default function Page() {
  return <JsonFormatter />;
}
