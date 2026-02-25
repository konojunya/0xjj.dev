import type { Metadata } from 'next';
import { tools } from '../lib/tools';
import ExifViewer from './ExifViewer';

const tool = tools.find((t) => t.slug === 'exif')!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

export default function Page() {
  return <ExifViewer />;
}
