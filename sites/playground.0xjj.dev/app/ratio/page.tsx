import { createToolMetadata } from '../lib/metadata';
import RatioCalculator from './RatioCalculator';

export const metadata = createToolMetadata('ratio');

export default function Page() {
  return <RatioCalculator />;
}
