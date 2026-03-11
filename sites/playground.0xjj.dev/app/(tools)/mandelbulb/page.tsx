import { createToolJsonLd, createToolMetadata } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import { MandelbulbLab } from './MandelbulbLab';

export const metadata = createToolMetadata('mandelbulb');

export default function Page() {
  trackView('mandelbulb');

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: createToolJsonLd('mandelbulb') }}
      />

      <div className="py-6">
        <div className="max-w-xl">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            Mandelbulb
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            GPUレイマーチングでリアルタイム描画する3Dマンデルバルブフラクタル。ポインターを動かしてカメラを回転、べき乗指数を調整してフラクタルの形状を変化させられます。
          </p>
        </div>

        <MandelbulbLab />
      </div>
    </>
  );
}
