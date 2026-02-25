import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };

export function createOgImage(title: string, description: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#fafafa',
          display: 'flex',
          flexDirection: 'column',
          padding: '72px 80px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        {/* top accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: '#0f0f0f',
          }}
        />

        {/* domain label */}
        <div
          style={{
            display: 'flex',
            fontSize: 22,
            color: '#a3a3a3',
            fontFamily: 'monospace',
            letterSpacing: '0.04em',
            marginBottom: 'auto',
          }}
        >
          tools.0xjj.dev
        </div>

        {/* title + description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              fontSize: 80,
              fontWeight: 700,
              color: '#0f0f0f',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 30,
              color: '#525252',
              lineHeight: 1.5,
              maxWidth: 900,
            }}
          >
            {description}
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
