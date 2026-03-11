import { createToolMetadata, createToolJsonLd } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import { tools } from '../../lib/tools';
import '../../lib/prose.css';
import { GyroCard } from './GyroCard';
import Ja from './ja.mdx';

const tool = tools.find((t) => t.slug === 'gyro-card')!;

export const metadata = createToolMetadata('gyro-card');

export default function Page() {
  trackView('gyro-card');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('gyro-card') }} />
      <div className="py-6">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          {tool.name}
        </h1>
        <p className="mt-1 text-sm text-muted">{tool.description}</p>

        <div className="mt-8 flex items-center justify-center rounded-xl bg-black/5 py-16 dark:bg-white/5">
          <GyroCard
            src="https://assets.xross-stars.com/card/BP01/BP01-124_0eba741fe2b68901705ed306b46e64e5.png"
            alt="サンプルトレーディングカード"
          />
        </div>

        <article className="prose mt-12 max-w-3xl">
          <Ja />
        </article>
      </div>
    </>
  );
}
