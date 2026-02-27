import type { Metadata } from 'next';
import { tools } from '../lib/tools';
import ConnectFour from './ConnectFour';

const tool = tools.find((t) => t.slug === 'connect-four')!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

export default function Page() {
  return <ConnectFour />;
}
