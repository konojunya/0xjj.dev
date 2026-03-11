'use client';

import { Camera, LoaderCircle, ScanFace, VideoOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

const PREVIEW_MAX_WIDTH = 960;
const OPENCV_WORKER_PATH = '/opencv/opencv.worker.js';
const OPENCV_LOAD_TIMEOUT_MS = 30_000;

function formatError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return 'カメラ権限が拒否されました。ブラウザの設定から camera を許可してください。';
    }
    if (error.name === 'NotFoundError') {
      return '利用可能なカメラが見つかりませんでした。';
    }
    if (error.name === 'NotReadableError') {
      return '他のアプリがカメラを使用中のため開始できませんでした。';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'カメラの起動に失敗しました。';
}

export function FaceDetectLab() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const workerRef = useRef<Worker | null>(null);

  const [isStarting, setIsStarting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoadingOpenCv, setIsLoadingOpenCv] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('開始前です');
  const [openCvStatus, setOpenCvStatus] = useState('未読み込み');
  const [resolution, setResolution] = useState<string | null>(null);

  const pausePreviewLoop = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const resumePreviewLoop = () => {
    if (!isRunningRef.current || animationFrameRef.current !== null) {
      return;
    }
    animationFrameRef.current = requestAnimationFrame(drawLoop);
  };

  const stopCamera = (reason: 'stopped' | 'failed' = 'stopped') => {
    pausePreviewLoop();

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    isRunningRef.current = false;
    setIsRunning(false);
    setStatus(reason === 'failed' ? '開始に失敗しました' : '停止しました');

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      workerRef.current?.terminate();
    };
  }, []);

  const drawLoop = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!video || !canvas || !ctx || !isRunningRef.current) {
      return;
    }

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      } catch (err) {
        console.error('[face-detect] preview draw failed', err);
        setError('カメラ映像の描画に失敗しました。');
        stopCamera('failed');
        return;
      }
    }

    animationFrameRef.current = requestAnimationFrame(drawLoop);
  };

  const startCamera = async () => {
    if (isStarting || isRunning) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('このブラウザは getUserMedia に対応していません。');
      return;
    }

    setError(null);
    setIsStarting(true);
    setStatus('カメラ権限を確認しています...');

    let acquiredStream: MediaStream | null = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      acquiredStream = stream;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas) {
        throw new Error('プレビュー要素の初期化に失敗しました。');
      }

      streamRef.current = stream;
      video.srcObject = stream;

      await new Promise<void>((resolve) => {
        if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
          resolve();
          return;
        }

        const handleLoadedMetadata = () => {
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          resolve();
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
      });

      await video.play();

      if (!video.videoWidth || !video.videoHeight) {
        throw new Error('カメラ映像の解像度を取得できませんでした。');
      }

      const previewWidth = Math.min(video.videoWidth, PREVIEW_MAX_WIDTH);
      const previewHeight = Math.round((video.videoHeight / video.videoWidth) * previewWidth);

      canvas.width = previewWidth;
      canvas.height = previewHeight;

      setResolution(`${video.videoWidth} × ${video.videoHeight}`);
      setStatus('カメラ映像を canvas に描画中です');
      isRunningRef.current = true;
      setIsRunning(true);
      resumePreviewLoop();
    } catch (err) {
      acquiredStream?.getTracks().forEach((track) => track.stop());
      setError(formatError(err));
      stopCamera('failed');
    } finally {
      setIsStarting(false);
    }
  };

  const handleLoadOpenCv = async () => {
    if (isLoadingOpenCv || openCvStatus === '準備完了') {
      return;
    }

    setError(null);
    setIsLoadingOpenCv(true);
    setOpenCvStatus('読み込み中...');

    try {
      const worker = new Worker(OPENCV_WORKER_PATH);
      workerRef.current = worker;

      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          worker.terminate();
          reject(new Error(`OpenCV の読み込みが ${OPENCV_LOAD_TIMEOUT_MS / 1000} 秒でタイムアウトしました。`));
        }, OPENCV_LOAD_TIMEOUT_MS);

        worker.onmessage = (e: MessageEvent) => {
          const msg = e.data;
          if (msg.type === 'ready') {
            window.clearTimeout(timeout);
            resolve();
          } else if (msg.type === 'error') {
            window.clearTimeout(timeout);
            reject(new Error(msg.error));
          }
        };

        worker.onerror = () => {
          window.clearTimeout(timeout);
          reject(new Error('OpenCV Worker の起動に失敗しました。'));
        };
      });

      setOpenCvStatus('準備完了');
    } catch (err) {
      console.error('[face-detect] OpenCV worker load failed', err);
      workerRef.current?.terminate();
      workerRef.current = null;
      setOpenCvStatus('読み込み失敗');
      setError(err instanceof Error ? err.message : 'OpenCV の読み込みに失敗しました。');
    } finally {
      setIsLoadingOpenCv(false);
    }
  };

  return (
    <section className="mt-8 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted">Status</div>
          <div className="mt-2 text-sm text-fg">{status}</div>
        </div>
        <div className="rounded-xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted">OpenCV</div>
          <div className="mt-2 text-sm text-fg">{openCvStatus}</div>
        </div>
        <div className="rounded-xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted">Resolution</div>
          <div className="mt-2 text-sm text-fg">{resolution ?? '-'}</div>
        </div>
        <div className="rounded-xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted">Stage</div>
          <div className="mt-2 text-sm text-fg">camera -&gt; canvas -&gt; OpenCV load</div>
        </div>
      </div>

      <div className="rounded-xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03] sm:p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg border border-black/10 bg-black/[0.03] p-2 dark:border-white/10 dark:bg-white/[0.04]">
            <ScanFace className="size-4 text-fg" />
          </div>
          <div>
            <h2 className="text-base font-medium text-fg">
              まずはカメラ映像を安定して canvas に描画します。
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              カメラ映像はどのサーバーにもアップロードせず、保存もしません。顔検出は次の段階で追加します。
            </p>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="aspect-video w-full bg-black/[0.04] object-cover dark:bg-white/[0.04]"
            />
            {!isRunning && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/85 backdrop-blur-sm dark:bg-black/65">
                <div className="max-w-md px-6 text-center">
                  <div className="mx-auto inline-flex size-14 items-center justify-center rounded-full border border-black/10 bg-black/[0.03] dark:border-white/14 dark:bg-white/6">
                    {isStarting ? <LoaderCircle className="size-6 animate-spin" /> : <Camera className="size-6" />}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-muted">
                    同意して開始を押すと、このページが camera 権限を要求します。
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.02]">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleLoadOpenCv}
                disabled={isLoadingOpenCv || openCvStatus === '準備完了'}
                className="font-mono text-xs"
              >
                {isLoadingOpenCv ? <LoaderCircle className="size-4 animate-spin" /> : <ScanFace className="size-4" />}
                OpenCV を読み込む
              </Button>
              <Button
                type="button"
                onClick={startCamera}
                disabled={isStarting || isRunning}
                className="font-mono text-xs"
              >
                {isStarting ? <LoaderCircle className="size-4 animate-spin" /> : <Camera className="size-4" />}
                同意してカメラを開始
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => stopCamera()}
                disabled={!isRunning}
                className="font-mono text-xs"
              >
                <VideoOff className="size-4" />
                停止
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

      </div>

      <video ref={videoRef} className="hidden" playsInline muted />
    </section>
  );
}
