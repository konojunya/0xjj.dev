import { createToolJsonLd, createToolMetadata } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import '../../lib/prose.css';
import { ReactionDiffusionLab } from './ReactionDiffusionLab';
import Ja from './ja.mdx';

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
            WebGPUコンピュートシェーダーでGPU上で動作するGray-Scott反応拡散シミュレーション。2つの仮想化学物質が反応・拡散し、斑点・縞模様・珊瑚のような有機的パターンを生み出します。
          </p>
        </div>

        <ReactionDiffusionLab />

        <article className="prose mt-12 max-w-3xl">
          <Ja />
        </article>
      </div>
    </>
  );
}
