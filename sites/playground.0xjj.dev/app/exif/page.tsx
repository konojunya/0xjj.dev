import { createToolMetadata } from '../lib/metadata';
import ExifViewer from './ExifViewer';

export const metadata = createToolMetadata('exif');

export default function Page() {
  return <ExifViewer />;
}
