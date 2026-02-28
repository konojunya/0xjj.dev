import { createToolMetadata } from '../lib/metadata';
import { trackView } from '../lib/views';
import EasingVisualizer from './EasingVisualizer';

export const metadata = createToolMetadata('easing');

export default function Page() {
  trackView('easing');
  return <EasingVisualizer />;
}
