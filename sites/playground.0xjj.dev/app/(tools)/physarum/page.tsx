import { createToolJsonLd, createToolMetadata } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import { PhysarumLab } from './PhysarumLab';

export const metadata = createToolMetadata('physarum');

export default function Page() {
  trackView('physarum');

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: createToolJsonLd('physarum') }}
      />

      <div className="py-6">
        <div className="max-w-xl">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            Physarum
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            粘菌（Physarum polycephalum）のシミュレーション。大量のエージェントが
            化学物質の痕跡を残しながら移動し、自己組織化して有機的なネットワーク
            パターンを形成します。WebGPU compute shader で全て GPU 上で実行。
          </p>
        </div>

        <PhysarumLab />
      </div>
    </>
  );
}
