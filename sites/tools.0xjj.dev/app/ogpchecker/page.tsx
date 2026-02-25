import type { Metadata } from 'next';
import OgpChecker from './OgpChecker';

export const metadata: Metadata = {
  title: 'OGP Checker',
};

export default function Page() {
  return <OgpChecker />;
}
