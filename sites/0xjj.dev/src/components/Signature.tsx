import { Penflow } from 'penflow/react';
import { useEffect, useRef, useState } from 'react';

export default function Signature() {
  const [color, setColor] = useState('#0e0d0c');
  const [visible, setVisible] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setColor(mq.matches ? '#f7f4ef' : '#0e0d0c');
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} style={{ minHeight: '120px' }}>
      {visible && (
        <Penflow
          text="Junya Kono"
          fontUrl="/fonts/BrittanySignature.ttf"
          color={color}
          size={50}
          lineHeight={2}
        />
      )}
    </div>
  );
}
