import { createToolJsonLd, createToolMetadata } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import '../../lib/prose.css';
import { AudioTerrainLab } from './AudioTerrainLab';
import Ja from './ja.mdx';

export const metadata = createToolMetadata('audio-terrain');

export default function Page() {
  trackView('audio-terrain');

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: createToolJsonLd('audio-terrain') }}
      />

      <div className="py-6">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            Audio Terrain
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            マイクのFFTスペクトルを3D地形に変換し、音楽がリアルタイムで山脈を生成するビジュアライゼーション。Bass
            → 山（大きな地形）、Treble → 細かいディテール。処理はすべてブラウザ内で完結します。
          </p>
        </div>

        <AudioTerrainLab />

        <article className="prose mt-12 max-w-3xl">
          <Ja />
        </article>
      </div>
    </>
  );
}
