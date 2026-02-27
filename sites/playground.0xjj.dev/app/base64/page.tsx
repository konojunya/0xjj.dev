import type { Metadata } from 'next';
import { tools } from '../lib/tools';
import Base64Tool from './Base64Tool';

const tool = tools.find((t) => t.slug === 'base64')!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

export default function Page() {
  return <Base64Tool />;
}
