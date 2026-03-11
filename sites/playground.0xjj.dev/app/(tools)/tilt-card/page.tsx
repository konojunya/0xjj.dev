import { createToolMetadata, createToolJsonLd } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import { tools } from '../../lib/tools';
import '../../lib/prose.css';
import { TiltCard } from './TiltCard';
import Ja from './ja.mdx';

const tool = tools.find((t) => t.slug === 'tilt-card')!;

export const metadata = createToolMetadata('tilt-card');

export default function Page() {
  trackView('tilt-card');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: createToolJsonLd('tilt-card') }} />
      <div className="py-6">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          {tool.name}
        </h1>
        <p className="mt-1 text-sm text-muted">{tool.description}</p>

        <div className="mt-8 flex items-center justify-center rounded-xl bg-black/5 py-16 dark:bg-white/5">
          <div className="w-60">
            <TiltCard
              src="https://assets.xross-stars.com/card/BP02/BP02-087_e065c07289840e4acafe8ee5cfa59ac8.png"
              backSrc="https://assets.xross-stars.com/card/BP02/BP02-087_84dec236315bfdac4acc02146ea507d6.png"
              alt="Sample trading card"
            />
          </div>
        </div>

        <article className="prose mt-12 max-w-3xl">
          <Ja />
        </article>
      </div>
    </>
  );
}
