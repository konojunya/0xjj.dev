import { createToolJsonLd, createToolMetadata } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import { CurlNoiseLab } from './CurlNoiseLab';

export const metadata = createToolMetadata('curl-noise');

export default function Page() {
  trackView('curl-noise');

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: createToolJsonLd('curl-noise') }}
      />

      <div className="py-6">
        <div className="max-w-xl">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            Curl Noise Flow Field
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Thousands of particles flowing through a divergence-free curl noise
            vector field, creating fluid-like visuals. The simulation runs
            entirely on the GPU via WebGPU compute shaders with a trail fade
            effect for smooth, organic motion.
          </p>
        </div>

        <CurlNoiseLab />
      </div>
    </>
  );
}
