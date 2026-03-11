import { createToolJsonLd, createToolMetadata } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import '../../lib/prose.css';
import { CurlNoiseLab } from './CurlNoiseLab';
import Ja from './ja.mdx';

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
            発散のないカールノイズベクトル場を流れる数千のパーティクルが、流体のようなビジュアルを生み出します。WebGPUコンピュートシェーダーでGPU上で動作し、トレイルフェードで滑らかな有機的な動きを実現しています。
          </p>
        </div>

        <CurlNoiseLab />

        <article className="prose mt-12 max-w-3xl">
          <Ja />
        </article>
      </div>
    </>
  );
}
