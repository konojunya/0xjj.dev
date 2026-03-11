'use client';

import { Camera, LoaderCircle, ScanFace, VideoOff } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

const PREVIEW_MAX_WIDTH = 640;
const OPENCV_WORKER_PATH = '/opencv/opencv.worker.js';
const OPENCV_LOAD_TIMEOUT_MS = 30_000;

type FaceRect = { x: number; y: number; w: number; h: number };

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
  if (error instanceof Error) return error.message;
  return 'カメラの起動に失敗しました。';
}

export function FaceDetectLab() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const workerRef = useRef<Worker | null>(null);
  const workerReadyRef = useRef(false);
  const detectingRef = useRef(false);
  const facesRef = useRef<FaceRect[]>([]);

  const [isStarting, setIsStarting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('開始前です');
  const [openCvStatus, setOpenCvStatus] = useState('未読み込み');
  const [resolution, setResolution] = useState<string | null>(null);
  const [faceCount, setFaceCount] = useState(0);

  const pausePreviewLoop = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const stopCamera = useCallback(
    (reason: 'stopped' | 'failed' = 'stopped') => {
      pausePreviewLoop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      isRunningRef.current = false;
      detectingRef.current = false;
      facesRef.current = [];
      setIsRunning(false);
      setFaceCount(0);
      setStatus(reason === 'failed' ? '開始に失敗しました' : '停止しました');

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (videoRef.current) videoRef.current.srcObject = null;
    },
    [pausePreviewLoop],
  );

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      workerRef.current?.terminate();
    };
  }, []);

  const drawLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!video || !canvas || !ctx || !isRunningRef.current) return;

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Draw face rectangles
      const faces = facesRef.current;
      if (faces.length > 0) {
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        for (const f of faces) {
          ctx.strokeRect(f.x, f.y, f.w, f.h);
        }
      }

      // Send frame to worker for detection (one at a time)
      const worker = workerRef.current;
      if (worker && workerReadyRef.current && !detectingRef.current) {
        detectingRef.current = true;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        worker.postMessage(
          { type: 'detect', buffer: imageData.data.buffer, width: canvas.width, height: canvas.height },
          [imageData.data.buffer],
        );
      }
    }

    animationFrameRef.current = requestAnimationFrame(drawLoop);
  }, []);

  const resumePreviewLoop = useCallback(() => {
    if (!isRunningRef.current || animationFrameRef.current !== null) return;
    animationFrameRef.current = requestAnimationFrame(drawLoop);
  }, [drawLoop]);

  const loadOpenCv = useCallback((): Promise<Worker> => {
    return new Promise((resolve, reject) => {
      setOpenCvStatus('読み込み中...');
      const worker = new Worker(OPENCV_WORKER_PATH);
      workerRef.current = worker;

      const timeout = window.setTimeout(() => {
        worker.terminate();
        reject(new Error(`OpenCV の読み込みが ${OPENCV_LOAD_TIMEOUT_MS / 1000} 秒でタイムアウトしました。`));
      }, OPENCV_LOAD_TIMEOUT_MS);

      worker.onmessage = (e: MessageEvent) => {
        const msg = e.data;
        if (msg.type === 'ready') {
          window.clearTimeout(timeout);
          workerReadyRef.current = true;
          setOpenCvStatus('準備完了');

          // Switch to detection message handler
          worker.onmessage = (ev: MessageEvent) => {
            if (ev.data.type === 'detect-result') {
              facesRef.current = ev.data.faces;
              detectingRef.current = false;
              setFaceCount(ev.data.faces.length);
            }
          };

          resolve(worker);
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
  }, []);

  const startCamera = useCallback(async (): Promise<void> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('このブラウザは getUserMedia に対応していません。');
    }

    setStatus('カメラ権限を確認しています...');

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error('プレビュー要素の初期化に失敗しました。');
    }

    streamRef.current = stream;
    video.srcObject = stream;

    await new Promise<void>((resolve) => {
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) { resolve(); return; }
      video.addEventListener('loadedmetadata', () => resolve(), { once: true });
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
  }, []);

  const handleStart = async () => {
    if (isStarting || isRunning) return;

    setError(null);
    setIsStarting(true);

    try {
      // Start camera and load OpenCV in parallel
      const [, worker] = await Promise.all([startCamera(), loadOpenCv()]);

      setStatus('顔検出中');
      isRunningRef.current = true;
      setIsRunning(true);
      resumePreviewLoop();

      // Set up detection handler (already done in loadOpenCv, but ensure reference)
      void worker;
    } catch (err) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      workerRef.current?.terminate();
      workerRef.current = null;
      workerReadyRef.current = false;
      setError(formatError(err));
      setStatus('開始に失敗しました');
      setOpenCvStatus((prev) => (prev === '準備完了' ? prev : '読み込み失敗'));
      if (videoRef.current) videoRef.current.srcObject = null;
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = () => {
    stopCamera();
    workerRef.current?.terminate();
    workerRef.current = null;
    workerReadyRef.current = false;
    setOpenCvStatus('未読み込み');
  };

  return (
    <section className="mt-8 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted">Faces</div>
          <div className="mt-2 text-sm text-fg">{isRunning ? faceCount : '-'}</div>
        </div>
      </div>

      <div className="rounded-xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03] sm:p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg border border-black/10 bg-black/[0.03] p-2 dark:border-white/10 dark:bg-white/[0.04]">
            <ScanFace className="size-4 text-fg" />
          </div>
          <div>
            <h2 className="text-base font-medium text-fg">
              リアルタイム顔検出
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              カメラ映像はどのサーバーにもアップロードせず、保存もしません。OpenCV.js (Haar Cascade) によるブラウザ内処理です。
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
                    {isStarting
                      ? 'カメラと OpenCV を読み込んでいます...'
                      : '開始を押すと、カメラ権限を要求し顔検出を開始します。'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.02]">
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleStart}
                disabled={isStarting || isRunning}
                className="font-mono text-xs"
              >
                {isStarting ? <LoaderCircle className="size-4 animate-spin" /> : <ScanFace className="size-4" />}
                顔検出を開始
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleStop}
                disabled={!isRunning && !isStarting}
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
