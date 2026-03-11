import { createToolJsonLd, createToolMetadata } from '../../lib/metadata';
import { trackView } from '../../lib/views';
import { FaceDetectLab } from './FaceDetectLab';

export const metadata = createToolMetadata('face-detect');

export default function Page() {
  trackView('face-detect');

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: createToolJsonLd('face-detect') }}
      />

      <div className="py-6">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            Face Detect Camera
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            OpenCV.js (Haar Cascade) を使ったリアルタイム顔検出。処理はすべてブラウザ内で完結します。
          </p>
        </div>

        <FaceDetectLab />
      </div>
    </>
  );
}
