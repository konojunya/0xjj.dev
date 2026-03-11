import { createToolJsonLd, createToolMetadata } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import { LSystemLab } from './LSystemLab';

export const metadata = createToolMetadata('l-system');

export default function Page() {
  trackView('l-system');

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: createToolJsonLd('l-system') }}
      />

      <div className="py-6">
        <div className="max-w-xl">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            L-System
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            リンデンマイヤーシステムは、単純な文字列置換規則とタートルグラフィクスにより、植物のようなフラクタル構造や空間充填曲線などの自己相似パターンを生成する並列書き換え文法です。
          </p>
        </div>

        <LSystemLab />
      </div>
    </>
  );
}
