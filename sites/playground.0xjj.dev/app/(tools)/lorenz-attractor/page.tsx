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
            ローレンツアトラクタは、3つの連立微分方程式からなるカオス系で、蝶の形をした軌道を永遠に描き続けます。このデモではフラグメントシェーダーでカラフルな流線として描画しています。
          </p>
        </div>

        <ShaderLab definition={lorenzAttractorDefinition} />
      </div>
    </>
  );
}
