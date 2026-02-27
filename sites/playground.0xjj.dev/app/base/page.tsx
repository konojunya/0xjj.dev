import { createToolMetadata } from '../lib/metadata';
import BaseConverter from './BaseConverter';

export const metadata = createToolMetadata('base');

export default function Page() {
  return <BaseConverter />;
}
