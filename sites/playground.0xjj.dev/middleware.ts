import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const baseCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://games-api.0xjj.dev wss://games-api.0xjj.dev",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const faceDetectCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' data: https://games-api.0xjj.dev wss://games-api.0xjj.dev",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;

  // Worker scripts in /opencv/ need unsafe-eval for asm.js + COEP to satisfy
  // the parent document's Cross-Origin-Embedder-Policy.
  if (pathname.startsWith('/opencv/')) {
    response.headers.set('Content-Security-Policy', faceDetectCsp);
    for (const [key, value] of Object.entries(securityHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }

  const isFaceDetect = pathname === '/face-detect' || pathname.startsWith('/face-detect/');

  response.headers.set('Content-Security-Policy', isFaceDetect ? faceDetectCsp : baseCsp);
  response.headers.set(
    'Permissions-Policy',
    isFaceDetect
      ? 'camera=(self), microphone=(), geolocation=()'
      : 'camera=(), microphone=(), geolocation=()',
  );

  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
