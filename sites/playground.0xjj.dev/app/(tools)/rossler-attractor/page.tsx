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
            レスラーアトラクタは、x-y平面上の平らな螺旋と特徴的な折り返しを描くカオス系で、時折z方向に跳ね上がります。このデモではフラグメントシェーダーでカラフルな流線として描画しています。
          </p>
        </div>

        <ShaderLab definition={rosslerAttractorDefinition} />
      </div>
    </>
  );
}
