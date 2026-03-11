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
            マイクのFFTスペクトルをレイマーチングと万華鏡で描画するVJスタイルのリアルタイムビジュアライゼーション。Bass
            → 形状モーフィング、Treble → ノイズディスプレースメント、Beat →
            フラッシュと色シフト。処理はすべてブラウザ内で完結します。
          </p>
        </div>

        <AudioReactorLab />
      </div>
    </>
  );
}
