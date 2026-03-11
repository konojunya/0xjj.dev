'use client';

import { motion, useSpring } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

type SensorState = 'idle' | 'requesting' | 'active' | 'unsupported' | 'denied';

const SPRING_CONFIG = { stiffness: 150, damping: 20, mass: 0.5 };
const MAX_TILT = 25;

export const GyroCard: React.FC<{
  src: string;
  alt?: string;
}> = ({ src, alt = '' }) => {
  const [sensorState, setSensorState] = useState<SensorState>('idle');
  const rotateX = useSpring(0, SPRING_CONFIG);
  const rotateY = useSpring(0, SPRING_CONFIG);
  const sheenX = useSpring(50, SPRING_CONFIG);
  const sheenY = useSpring(50, SPRING_CONFIG);
  const initialBeta = useRef<number | null>(null);
  const initialGamma = useRef<number | null>(null);

  const handleOrientation = useCallback(
    (e: DeviceOrientationEvent) => {
      const beta = e.beta ?? 0; // front-back (-180..180)
      const gamma = e.gamma ?? 0; // left-right (-90..90)

      if (initialBeta.current === null) {
        initialBeta.current = beta;
        initialGamma.current = gamma;
      }

      const relativeBeta = beta - (initialBeta.current ?? 0);
      const relativeGamma = gamma - (initialGamma.current ?? 0);

      const clampedBeta = Math.max(-MAX_TILT, Math.min(MAX_TILT, relativeBeta));
      const clampedGamma = Math.max(
        -MAX_TILT,
        Math.min(MAX_TILT, relativeGamma),
      );

      // beta -> rotateX (front-back tilt), gamma -> rotateY (left-right tilt)
      rotateX.set(-clampedBeta);
      rotateY.set(clampedGamma);

      // sheen position (0-100%)
      const sx = ((clampedGamma + MAX_TILT) / (MAX_TILT * 2)) * 100;
      const sy = ((clampedBeta + MAX_TILT) / (MAX_TILT * 2)) * 100;
      sheenX.set(sx);
      sheenY.set(sy);
    },
    [rotateX, rotateY, sheenX, sheenY],
  );

  const requestSensor = useCallback(async () => {
    setSensorState('requesting');

    // iOS 13+ requires explicit permission
    const DOE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof DOE.requestPermission === 'function') {
      try {
        const perm = await DOE.requestPermission();
        if (perm !== 'granted') {
          setSensorState('denied');
          return;
        }
      } catch {
        setSensorState('denied');
        return;
      }
    }

    setSensorState('active');
  }, []);

  // Check device capability on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasApi = 'DeviceOrientationEvent' in window;
    if (!hasApi) {
      setSensorState('unsupported');
      return;
    }

    // Desktop browsers have the API but no actual sensor.
    // Try listening for one event to detect.
    let timeout: ReturnType<typeof setTimeout>;
    let resolved = false;

    const probe = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      window.removeEventListener('deviceorientation', probe);
      // sensor exists — stay idle so user can tap to activate
    };

    window.addEventListener('deviceorientation', probe);

    timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        window.removeEventListener('deviceorientation', probe);
        // If we're on mobile (touch device) we may still get orientation events after permission
        // Only mark unsupported if no touch support
        const isTouch =
          'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (!isTouch) {
          setSensorState('unsupported');
        }
      }
    }, 1000);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('deviceorientation', probe);
    };
  }, []);

  // Attach orientation listener when active
  useEffect(() => {
    if (sensorState !== 'active') return;

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [sensorState, handleOrientation]);

  // Recalibrate on double tap
  const recalibrate = useCallback(() => {
    initialBeta.current = null;
    initialGamma.current = null;
  }, []);

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Card */}
      <div
        style={{ perspective: 1000 }}
        className="flex items-center justify-center"
      >
        <motion.div
          className="aspect-trading-card relative w-64 overflow-hidden rounded-2xl shadow-2xl sm:w-72"
          style={{
            rotateX,
            rotateY,
            transformStyle: 'preserve-3d',
            willChange: 'transform',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="pointer-events-none h-full w-full select-none object-cover"
            draggable={false}
          />
          {/* Holographic sheen overlay */}
          {sensorState === 'active' && <SheenLayer sheenX={sheenX} sheenY={sheenY} />}
        </motion.div>
      </div>

      {/* Controls */}
      {sensorState === 'unsupported' && <UnsupportedMessage />}

      {sensorState === 'denied' && (
        <div className="max-w-xs rounded-xl border border-red-300 bg-red-50 px-5 py-4 text-center text-sm text-red-700 dark:border-red-700/50 dark:bg-red-900/20 dark:text-red-300">
          <p className="font-medium">Permission Denied</p>
          <p className="mt-1 text-xs opacity-80">
            ブラウザの設定からモーションセンサーの権限を許可してください。
          </p>
        </div>
      )}

      {(sensorState === 'idle' || sensorState === 'requesting') && (
        <button
          type="button"
          onClick={requestSensor}
          disabled={sensorState === 'requesting'}
          className="rounded-xl bg-accent px-6 py-3 text-sm font-medium text-white shadow-lg transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
        >
          {sensorState === 'requesting'
            ? 'Requesting...'
            : 'Activate Gyroscope'}
        </button>
      )}

      {sensorState === 'active' && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted">
            デバイスを傾けてカードを動かしてみてください
          </p>
          <button
            type="button"
            onClick={recalibrate}
            className="rounded-lg border border-current/10 px-4 py-2 text-xs text-muted transition-colors hover:text-fg"
          >
            Recalibrate
          </button>
        </div>
      )}
    </div>
  );
};

/** Sheen layer that reacts to motion values */
function SheenLayer({
  sheenX,
  sheenY,
}: {
  sheenX: ReturnType<typeof useSpring>;
  sheenY: ReturnType<typeof useSpring>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const unsubX = sheenX.on('change', (v) => {
      el.style.setProperty('--sheen-x', `${v}%`);
    });
    const unsubY = sheenY.on('change', (v) => {
      el.style.setProperty('--sheen-y', `${v}%`);
    });

    return () => {
      unsubX();
      unsubY();
    };
  }, [sheenX, sheenY]);

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0 mix-blend-overlay"
      style={
        {
          '--sheen-x': '50%',
          '--sheen-y': '50%',
          background:
            'radial-gradient(circle at var(--sheen-x) var(--sheen-y), rgba(255,255,255,0.4) 0%, transparent 60%)',
        } as React.CSSProperties
      }
    />
  );
}

function UnsupportedMessage() {
  return (
    <div className="max-w-sm rounded-xl border border-amber-300 bg-amber-50 px-6 py-5 text-center dark:border-amber-700/50 dark:bg-amber-900/20">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-800/30">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="h-6 w-6 text-amber-600 dark:text-amber-400"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
          />
        </svg>
      </div>
      <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
        Accelerometer Not Available
      </p>
      <p className="mt-2 text-xs leading-relaxed text-amber-700 dark:text-amber-300/80">
        このデモは加速度センサー（ジャイロスコープ）を搭載したスマートフォンやタブレットでお楽しみいただけます。
        <br />
        お手持ちのモバイルデバイスからアクセスしてください。
      </p>
    </div>
  );
}
