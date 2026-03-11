'use client';

import { useEffect, useRef, useState } from 'react';

export default function QrCode() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [text, setText] = useState('https://playground.0xjj.dev');
  const [size, setSize] = useState(300);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!text.trim()) {
      setError('');
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && canvasRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      return;
    }

    import('qrcode').then((QRCode) => {
      QRCode.toCanvas(
        canvasRef.current,
        text,
        { width: size, margin: 2, errorCorrectionLevel: 'M' },
        (err) => {
          if (err) {
            setError(err.message);
          } else {
            setError('');
          }
        },
      );
    });
  }, [text, size]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'qrcode.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-fg)', marginBottom: '0.25rem' }}>
        QR Code Generator
      </h1>
      <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        テキストやURLからQRコードを生成し、PNGでダウンロードできます。
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.4rem' }}>
            テキストまたはURL
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="テキストまたはURLを入力..."
            rows={3}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 8,
              border: '1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)',
              background: 'color-mix(in srgb, var(--color-fg) 5%, transparent)',
              color: 'var(--color-fg)',
              fontSize: '0.9rem',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
            サイズ: {size}px
          </label>
          <input
            type="range"
            min={128}
            max={512}
            step={8}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--color-accent)' }}
          />
        </div>

        {error && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: 8, background: 'color-mix(in srgb, red 10%, transparent)', color: 'var(--color-fg)', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              padding: '1rem',
              borderRadius: 12,
              border: '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)',
              background: '#fff',
              display: 'inline-flex',
            }}
          >
            <canvas ref={canvasRef} width={size} height={size} />
          </div>

          {text.trim() && !error && (
            <button
              onClick={download}
              style={{
                padding: '0.6rem 1.5rem',
                borderRadius: 8,
                border: 'none',
                background: 'var(--color-accent)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              PNGをダウンロード
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
