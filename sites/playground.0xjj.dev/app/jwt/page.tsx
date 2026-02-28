import { createToolMetadata } from '../lib/metadata';
import { trackView } from '../lib/views';
import JwtDecoder from './JwtDecoder';

export const metadata = createToolMetadata('jwt');

export default function Page() {
  trackView('jwt');
  return <JwtDecoder />;
}
