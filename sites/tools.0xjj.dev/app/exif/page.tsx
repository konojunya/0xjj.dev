import type { Metadata } from 'next';
import ExifViewer from './ExifViewer';

export const metadata: Metadata = {
  title: 'EXIF Viewer',
};

export default function Page() {
  return <ExifViewer />;
}
