import { createToolJsonLd, createToolMetadata } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import { ReactionDiffusionLab } from './ReactionDiffusionLab';

export const metadata = createToolMetadata('reaction-diffusion');

export default function Page() {
  trackView('reaction-diffusion');

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: createToolJsonLd('reaction-diffusion') }}
      />

      <div className="py-6">
        <div className="max-w-xl">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            Reaction-Diffusion
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Gray-Scott reaction-diffusion simulation running entirely on the GPU
            via WebGPU compute shaders. Two virtual chemicals react and diffuse,
            producing organic patterns like spots, stripes, and coral-like
            structures.
          </p>
        </div>

        <ReactionDiffusionLab />
      </div>
    </>
  );
}
