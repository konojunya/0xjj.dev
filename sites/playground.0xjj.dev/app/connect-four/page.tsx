import { createToolMetadata } from '../lib/metadata';
import ConnectFour from './ConnectFour';

export const metadata = createToolMetadata('connect-four');

export default function Page() {
  return <ConnectFour />;
}
