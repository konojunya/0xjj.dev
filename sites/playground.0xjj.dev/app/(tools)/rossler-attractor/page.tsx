import { ShaderLab } from '@/components/shader-lab/ShaderLab';
import { createToolJsonLd, createToolMetadata } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import { rosslerAttractorDefinition } from './definition';

export const metadata = createToolMetadata('rossler-attractor');

export default function Page() {
  trackView('rossler-attractor');

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: createToolJsonLd('rossler-attractor') }}
      />

      <div className="py-6">
        <div className="max-w-xl">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            Rössler Attractor
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            The Rössler attractor is a chaotic system that traces a flat spiral
            band with a characteristic fold — mostly confined to the x-y plane
            with occasional excursions in z. This demo renders it as flowing
            colored lines in a fragment shader.
          </p>
        </div>

        <ShaderLab definition={rosslerAttractorDefinition} />
      </div>
    </>
  );
}
