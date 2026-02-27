import { createToolMetadata } from '../lib/metadata';
import EasingVisualizer from './EasingVisualizer';

export const metadata = createToolMetadata('easing');

export default function Page() {
  return <EasingVisualizer />;
}
