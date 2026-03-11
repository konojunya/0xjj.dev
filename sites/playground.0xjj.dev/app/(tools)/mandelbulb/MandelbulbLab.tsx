'use client';

import { ShaderLab } from '@/components/shader-lab/ShaderLab';
import { mandelbulbDefinition } from './definition';

export function MandelbulbLab() {
  return <ShaderLab definition={mandelbulbDefinition} />;
}
