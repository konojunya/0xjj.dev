import { createToolMetadata } from '../lib/metadata';
import Base64Tool from './Base64Tool';

export const metadata = createToolMetadata('base64');

export default function Page() {
  return <Base64Tool />;
}
