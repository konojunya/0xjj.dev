'use client';

import { ShaderLab } from '@/components/shader-lab/ShaderLab';
import { physarumDefinition } from './definition';

export function PhysarumLab() {
  return <ShaderLab definition={physarumDefinition} />;
}
