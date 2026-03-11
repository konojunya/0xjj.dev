'use client';

import { motion, useSpring } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

type SensorState = 'idle' | 'requesting' | 'active' | 'unsupported' | 'denied';

const SPRING_CONFIG = { stiffness: 150, damping: 20, mass: 0.5 };
const MAX_TILT = 25;

export const SensorCard: React.FC<{
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
      const beta = e.beta ?? 0;
      const gamma = e.gamma ?? 0;

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

      rotateX.set(-clampedBeta);
      rotateY.set(clampedGamma);

      const sx = ((clampedGamma + MAX_TILT) / (MAX_TILT * 2)) * 100;
      const sy = ((clampedBeta + MAX_TILT) / (MAX_TILT * 2)) * 100;
      sheenX.set(sx);
      sheenY.set(sy);
    },
    [rotateX, rotateY, sheenX, sheenY],
  );

  const requestSensor = useCallback(async () => {
    setSensorState('requesting');

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

    let timeout: ReturnType<typeof setTimeout>;
    let resolved = false;

    const probe = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      window.removeEventListener('deviceorientation', probe);
    };

    window.addEventListener('deviceorientation', probe);

    timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        window.removeEventListener('deviceorientation', probe);
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

  const recalibrate = useCallback(() => {
    initialBeta.current = null;
    initialGamma.current = null;
  }, []);

  const needsActivation = sensorState === 'idle' || sensorState === 'requesting';

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Card with overlay */}
      <div
        style={{ perspective: 1000 }}
        className="relative flex items-center justify-center"
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
          {sensorState === 'active' && (
            <SheenLayer sheenX={sheenX} sheenY={sheenY} />
          )}
          {/* Activation overlay — blurred glass on the card */}
          {(needsActivation || sensorState === 'denied') && (
            <button
              type="button"
              onClick={sensorState === 'denied' ? undefined : requestSensor}
              disabled={sensorState === 'requesting' || sensorState === 'denied'}
              className="absolute inset-0 z-10 flex cursor-pointer flex-col items-center justify-center gap-3 bg-black/30 backdrop-blur-md transition-opacity active:bg-black/40 disabled:cursor-not-allowed"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-8 w-8 text-white/90"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                />
              </svg>
              {sensorState === 'denied' ? (
                <>
                  <span className="text-sm font-medium text-white">
                    Permission Denied
                  </span>
                  <span className="px-4 text-center text-xs text-white/70">
                    ブラウザの設定からモーションセンサーの権限を許可してください
                  </span>
                </>
              ) : (
                <span className="text-sm font-medium text-white">
                  {sensorState === 'requesting'
                    ? 'Requesting...'
                    : 'Tap to allow sensor'}
                </span>
              )}
            </button>
          )}
          {/* Unsupported overlay */}
          {sensorState === 'unsupported' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-md">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-8 w-8 text-white/80"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                />
              </svg>
              <span className="text-sm font-medium text-white">
                Sensor Not Available
              </span>
              <span className="px-4 text-center text-xs leading-relaxed text-white/70">
                このデモはモーションセンサーを搭載した
                <br />
                モバイルデバイスでお楽しみいただけます
              </span>
            </div>
          )}
        </motion.div>
      </div>

      {/* Recalibrate (only when active) */}
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
