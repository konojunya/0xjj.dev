'use client';

import { Camera, LoaderCircle, ScanFace, VideoOff } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

const PREVIEW_MAX_WIDTH = 640;
const OPENCV_WORKER_PATH = '/opencv/opencv.worker.js';
const OPENCV_LOAD_TIMEOUT_MS = 30_000;

// Zoom parameters
const ZOOM_PADDING = 1.3; // face fills ~77% of viewport
const LERP_SPEED = 0.06;
const MIN_VIEWPORT = 0.025; // max 40x zoom
const NO_FACE_ZOOM_OUT_FRAMES = 60; // ~1 sec at 60fps

type FaceRect = { x: number; y: number; w: number; h: number };
type Viewport = { x: number; y: number; w: number; h: number };

const FULL_VIEW: Viewport = { x: 0, y: 0, w: 1, h: 1 };

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function formatError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError')
      return 'カメラ権限が拒否されました。ブラウザの設定から camera を許可してください。';
    if (error.name === 'NotFoundError')
      return '利用可能なカメラが見つかりませんでした。';
    if (error.name === 'NotReadableError')
      return '他のアプリがカメラを使用中のため開始できませんでした。';
  }
  if (error instanceof Error) return error.message;
  return 'カメラの起動に失敗しました。';
}

export function FaceDetectLab() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectCanvasRef = useRef<OffscreenCanvas | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const workerRef = useRef<Worker | null>(null);
  const workerReadyRef = useRef(false);
  const detectingRef = useRef(false);
  const facesRef = useRef<FaceRect[]>([]);
  const viewportRef = useRef<Viewport>({ ...FULL_VIEW });
  const targetViewportRef = useRef<Viewport>({ ...FULL_VIEW });
  const noFaceFramesRef = useRef(0);

  const [isStarting, setIsStarting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('開始前です');
  const [openCvStatus, setOpenCvStatus] = useState('未読み込み');
  const [resolution, setResolution] = useState<string | null>(null);
  const [faceCount, setFaceCount] = useState(0);
  const [zoomLevel, setZoomLevel] = useState('1.0x');

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
      viewportRef.current = { ...FULL_VIEW };
      targetViewportRef.current = { ...FULL_VIEW };
      noFaceFramesRef.current = 0;
      setIsRunning(false);
      setFaceCount(0);
      setZoomLevel('1.0x');
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

  const updateZoomTarget = useCallback((faces: FaceRect[], cw: number, ch: number) => {
    // Bounding box of all faces
    let minX = Infinity;
    let minY = Infinity;
    let maxX = 0;
    let maxY = 0;
    for (const f of faces) {
      minX = Math.min(minX, f.x);
      minY = Math.min(minY, f.y);
      maxX = Math.max(maxX, f.x + f.w);
      maxY = Math.max(maxY, f.y + f.h);
    }

    // Normalize to 0-1
    const nCx = (minX + maxX) / 2 / cw;
    const nCy = (minY + maxY) / 2 / ch;
    const nFaceW = (maxX - minX) / cw;
    const nFaceH = (maxY - minY) / ch;

    // In normalized coords, w and h must be equal to preserve aspect ratio
    // (the 0-1 mapping already accounts for different pixel dimensions)
    let size = Math.max(nFaceW, nFaceH) * ZOOM_PADDING;
    size = Math.max(MIN_VIEWPORT, Math.min(1, size));

    const tx = Math.max(0, Math.min(1 - size, nCx - size / 2));
    const ty = Math.max(0, Math.min(1 - size, nCy - size / 2));

    targetViewportRef.current = { x: tx, y: ty, w: size, h: size };
  }, []);

  const drawLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const detectCanvas = detectCanvasRef.current;

    if (!video || !canvas || !ctx || !isRunningRef.current) return;

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      // Lerp viewport towards target
      const vp = viewportRef.current;
      const target = targetViewportRef.current;
      vp.x = lerp(vp.x, target.x, LERP_SPEED);
      vp.y = lerp(vp.y, target.y, LERP_SPEED);
      vp.w = lerp(vp.w, target.w, LERP_SPEED);
      vp.h = lerp(vp.h, target.h, LERP_SPEED);

      // Draw zoomed video to visible canvas
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      ctx.drawImage(
        video,
        vp.x * vw, vp.y * vh, vp.w * vw, vp.h * vh,
        0, 0, canvas.width, canvas.height,
      );

      // Draw face rectangles (mapped from detection coords to zoomed canvas coords)
      const faces = facesRef.current;
      if (faces.length > 0 && detectCanvas) {
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        for (const f of faces) {
          const nx = f.x / detectCanvas.width;
          const ny = f.y / detectCanvas.height;
          const nw = f.w / detectCanvas.width;
          const nh = f.h / detectCanvas.height;

          const dx = ((nx - vp.x) / vp.w) * canvas.width;
          const dy = ((ny - vp.y) / vp.h) * canvas.height;
          const dw = (nw / vp.w) * canvas.width;
          const dh = (nh / vp.h) * canvas.height;

          ctx.strokeRect(dx, dy, dw, dh);
        }
      }

      // Update zoom level display (throttled to avoid excessive re-renders)
      const currentZoom = 1 / vp.w;
      setZoomLevel(`${currentZoom.toFixed(1)}x`);

      // Send full frame to worker for detection
      const worker = workerRef.current;
      if (worker && workerReadyRef.current && !detectingRef.current && detectCanvas) {
        const detectCtx = detectCanvas.getContext('2d');
        if (detectCtx) {
          detectCtx.drawImage(video, 0, 0, detectCanvas.width, detectCanvas.height);
          detectingRef.current = true;
          const imageData = detectCtx.getImageData(0, 0, detectCanvas.width, detectCanvas.height);
          worker.postMessage(
            { type: 'detect', buffer: imageData.data.buffer, width: detectCanvas.width, height: detectCanvas.height },
            [imageData.data.buffer],
          );
        }
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
              const faces: FaceRect[] = ev.data.faces;
              facesRef.current = faces;
              detectingRef.current = false;
              setFaceCount(faces.length);

              const dc = detectCanvasRef.current;
              if (faces.length > 0 && dc) {
                noFaceFramesRef.current = 0;
                updateZoomTarget(faces, dc.width, dc.height);
              } else {
                noFaceFramesRef.current++;
                if (noFaceFramesRef.current > NO_FACE_ZOOM_OUT_FRAMES) {
                  targetViewportRef.current = { ...FULL_VIEW };
                }
              }
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
  }, [updateZoomTarget]);

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

    // Create off-screen canvas for detection (always full frame)
    detectCanvasRef.current = new OffscreenCanvas(previewWidth, previewHeight);

    setResolution(`${video.videoWidth} × ${video.videoHeight}`);
  }, []);

  const handleStart = async () => {
    if (isStarting || isRunning) return;

    setError(null);
    setIsStarting(true);

    try {
      await Promise.all([startCamera(), loadOpenCv()]);

      setStatus('顔検出中');
      isRunningRef.current = true;
      setIsRunning(true);
      resumePreviewLoop();
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
    detectCanvasRef.current = null;
    setOpenCvStatus('未読み込み');
  };

  return (
    <section className="mt-8 space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
        <div className="rounded-xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted">Zoom</div>
          <div className="mt-2 text-sm text-fg">{isRunning ? zoomLevel : '-'}</div>
        </div>
      </div>

      <div className="rounded-xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03] sm:p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg border border-black/10 bg-black/[0.03] p-2 dark:border-white/10 dark:bg-white/[0.04]">
            <ScanFace className="size-4 text-fg" />
          </div>
          <div>
            <h2 className="text-base font-medium text-fg">
              リアルタイム顔検出 + オートズーム
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              顔を検出すると自動でズームイン。顔が消えると約1秒後にズームアウトします。処理はすべてブラウザ内で完結します。
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
