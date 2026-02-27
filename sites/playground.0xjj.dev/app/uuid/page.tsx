import { createToolMetadata } from '../lib/metadata';
import UuidGenerator from './UuidGenerator';

export const metadata = createToolMetadata('uuid');

export default function Page() {
  return <UuidGenerator />;
}
