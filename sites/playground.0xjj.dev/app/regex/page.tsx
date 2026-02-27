import { createToolMetadata } from '../lib/metadata';
import RegexTester from './RegexTester';

export const metadata = createToolMetadata('regex');

export default function Page() {
  return <RegexTester />;
}
