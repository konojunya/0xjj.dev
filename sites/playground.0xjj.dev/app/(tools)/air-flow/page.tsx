import { createToolJsonLd, createToolMetadata } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import '../../lib/prose.css';
import { AirFlowLab } from './AirFlowLab';
import Ja from './ja.mdx';

export const metadata = createToolMetadata('air-flow');

export default function Page() {
  trackView('air-flow');

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: createToolJsonLd('air-flow') }}
      />

      <div className="py-6">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            Air Flow
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Webカメラの動きをオプティカルフローで検出し、パーティクルが空気のように流されるインタラクティブ可視化。処理はすべてブラウザ内で完結します。
          </p>
        </div>

        <AirFlowLab />

        <article className="prose mt-12 max-w-3xl">
          <Ja />
        </article>
      </div>
    </>
  );
}
