import type { Metadata } from 'next';
import { tools } from '../lib/tools';
import JwtDecoder from './JwtDecoder';

const tool = tools.find((t) => t.slug === 'jwt')!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

export default function Page() {
  return <JwtDecoder />;
}
