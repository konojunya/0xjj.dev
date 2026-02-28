import { createToolMetadata } from '../lib/metadata';
import { trackView } from '../lib/views';
import ConnectFour from './ConnectFour';

export const metadata = createToolMetadata('connect-four');

export default function Page() {
  trackView('connect-four');
  return <ConnectFour />;
}
