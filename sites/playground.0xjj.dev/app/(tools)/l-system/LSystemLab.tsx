'use client';

import { ShaderLab } from '@/components/shader-lab/ShaderLab';
import { lSystemDefinition } from './definition';

export function LSystemLab() {
  return <ShaderLab definition={lSystemDefinition} />;
}
