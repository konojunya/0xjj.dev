import { ShaderLab } from '@/components/shader-lab/ShaderLab';
import { createToolJsonLd, createToolMetadata } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import { lorenzAttractorDefinition } from './definition';

export const metadata = createToolMetadata('lorenz-attractor');

export default function Page() {
  trackView('lorenz-attractor');

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: createToolJsonLd('lorenz-attractor') }}
      />

      <div className="py-6">
        <div className="max-w-xl">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            Lorenz Attractor
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            The Lorenz attractor is a chaotic system of three coupled differential
            equations that traces an endlessly evolving butterfly-shaped trajectory.
            This demo renders it as flowing colored lines in a fragment shader.
          </p>
        </div>

        <ShaderLab definition={lorenzAttractorDefinition} />
      </div>
    </>
  );
}
