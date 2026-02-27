import { createToolMetadata } from '../lib/metadata';
import JwtDecoder from './JwtDecoder';

export const metadata = createToolMetadata('jwt');

export default function Page() {
  return <JwtDecoder />;
}
