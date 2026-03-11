'use client';

import { ShaderLab } from '@/components/shader-lab/ShaderLab';
import { reactionDiffusionDefinition } from './definition';

export function ReactionDiffusionLab() {
  return <ShaderLab definition={reactionDiffusionDefinition} />;
}
