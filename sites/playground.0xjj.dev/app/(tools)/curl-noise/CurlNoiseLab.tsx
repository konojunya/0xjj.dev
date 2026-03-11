'use client';

import { ShaderLab } from '@/components/shader-lab/ShaderLab';
import { curlNoiseDefinition } from './definition';

export function CurlNoiseLab() {
  return <ShaderLab definition={curlNoiseDefinition} />;
}
