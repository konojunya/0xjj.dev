import { createToolJsonLd, createToolMetadata } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import { AudioReactorLab } from './AudioReactorLab';

export const metadata = createToolMetadata('audio-reactor');

export default function Page() {
  trackView('audio-reactor');

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: createToolJsonLd('audio-reactor') }}
      />

      <div className="py-6">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            Audio Reactor
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            マイクのFFTスペクトルでレイマーチングされた万華鏡空間が脈動するVJビジュアライゼーション。音が豊かなほど万華鏡が複雑に割れ、Bassで形状が膨張し、Beatで画面がフラッシュ。無音では暗闇に沈み、音で一気に爆発します。処理はすべてブラウザ内で完結します。
          </p>
        </div>

        <AudioReactorLab />
      </div>
    </>
  );
}
