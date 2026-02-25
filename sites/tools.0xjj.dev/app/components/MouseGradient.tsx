'use client';

import { useEffect, useRef } from 'react';

export default function MouseGradient() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMove = (e: MouseEvent) => {
      el.style.setProperty('--x', `${e.clientX}px`);
      el.style.setProperty('--y', `${e.clientY}px`);
    };

    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed inset-0 z-0 hidden md:block"
      style={{
        background:
          'radial-gradient(700px at var(--x, 50%) var(--y, 50%), rgba(99,102,241,0.07), transparent 80%)',
      }}
    />
  );
}
