import { ShaderLab } from '@/components/shader-lab/ShaderLab';
import { createToolJsonLd, createToolMetadata } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import { deJongAttractorDefinition } from './definition';

export const metadata = createToolMetadata('dejong-attractor');

export default function Page() {
  trackView('dejong-attractor');

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: createToolJsonLd('dejong-attractor') }}
      />

      <div className="py-6">
        <div className="max-w-xl">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            De Jong Attractor
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            The De Jong attractor is a 2D discrete map discovered by Peter de Jong
            that produces intricate, swirling patterns from four trigonometric
            equations. This demo renders the orbit as colored line segments in a
            fragment shader.
          </p>
        </div>

        <ShaderLab definition={deJongAttractorDefinition} />
      </div>
    </>
  );
}
