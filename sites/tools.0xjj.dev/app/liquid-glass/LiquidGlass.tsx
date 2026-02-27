'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Glass capsule dimensions (px) */
const W = 210;
const H = 150;
const R = 75;

const MAP_SRCS = ['/liquid-glass/zoom.png', '/liquid-glass/refract.png', '/liquid-glass/highlight.png'];

export default function LiquidGlass() {
  const [pos, setPos] = useState({ x: 24, y: 24 });
  const [mapsReady, setMapsReady] = useState(false);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  // Preload displacement map images before showing the glass
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      MAP_SRCS.map(
        (src) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = src;
          }),
      ),
    ).then(() => {
      if (!cancelled) setMapsReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pos],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <a
        href="/"
        className="mb-6 inline-block font-mono text-xs text-muted transition-colors hover:text-fg"
      >
        ← back
      </a>
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Liquid Glass</h1>
      <p className="mt-1 text-sm text-muted">
        Drag the capsule to bend the page. SVG displacement filter refracts whatever sits beneath it.
      </p>
      <p className="mt-2 rounded bg-yellow-500/10 px-3 py-1.5 text-xs text-yellow-600 dark:text-yellow-400">
        Requires Chrome / Edge. backdrop-filter + SVG filter is not supported in Firefox / Safari.
      </p>

      {/* ── Demo ── */}
      <div className="relative mt-6 h-[440px] overflow-hidden rounded-xl border border-black/10 bg-white select-none dark:border-white/10 dark:bg-black sm:h-[460px]">
        {/* Background scene */}
        <div className="absolute inset-0 grid grid-cols-1 gap-6 p-6 sm:grid-cols-[1fr_46%] sm:gap-10 sm:p-10">
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-3 text-violet-600 dark:text-violet-400">
              <span className="h-[2px] w-10 bg-current" />
              <span className="text-[11px] font-medium uppercase tracking-[0.25em]">UI Lab</span>
            </div>
            <h3 className="mt-4 text-[36px] font-extrabold leading-[0.95] tracking-tight text-black sm:text-[54px] dark:text-white">
              Liquid&nbsp;Glass Demo
            </h3>
            <div className="mt-4 max-w-[60ch] space-y-3 text-[15px] leading-[1.55] text-black/70 sm:text-[16px] dark:text-white/70">
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
                exercitation ullamco laboris.
              </p>
              <p>
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
                fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.
              </p>
              <p className="text-black/60 dark:text-white/60">
                Sunt in culpa qui officia deserunt mollit anim id est laborum.
              </p>
            </div>
          </div>
          <div className="relative hidden overflow-hidden rounded-lg ring-1 ring-black/10 sm:block dark:ring-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/liquid-glass/bg.png"
              alt="JJ logo"
              loading="lazy"
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </div>

        {/* Draggable glass — hidden until displacement maps are loaded */}
        {mapsReady && <div
          className="absolute z-10 cursor-grab active:cursor-grabbing"
          draggable={false}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          style={{
            left: pos.x,
            top: pos.y,
            width: W,
            height: H,
            borderRadius: R,
            transform: 'scaleY(0.8)',
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          <svg colorInterpolationFilters="sRGB" style={{ display: 'none' }}>
            <defs>
              <filter id="glass-refract">
                {/* 1. Zoom: 中心から外側へ軽く拡大する displacement */}
                <feImage href="/liquid-glass/zoom.png" x={0} y={0} width={W} height={H} result="zm" />
                <feDisplacementMap in="SourceGraphic" in2="zm" scale={24} xChannelSelector="R" yChannelSelector="G" result="zoomed" />
                {/* 2. Refract: ベゼル形状で屈折させる displacement */}
                <feImage href="/liquid-glass/refract.png" x={0} y={0} width={W} height={H} result="rf" />
                <feDisplacementMap in="zoomed" in2="rf" scale={98} xChannelSelector="R" yChannelSelector="G" result="bent" />
                {/* 3. Saturate: 屈折後の彩度を上げてガラスらしく */}
                <feColorMatrix in="bent" type="saturate" values="9" result="vivid" />
                {/* 4. Specular: ハイライトレイヤーを合成 */}
                <feImage href="/liquid-glass/highlight.png" x={0} y={0} width={W} height={H} result="hl" />
                <feComposite in="vivid" in2="hl" operator="in" result="hl-sat" />
                <feComponentTransfer in="hl" result="hl-fade">
                  <feFuncA type="linear" slope={0.5} />
                </feComponentTransfer>
                {/* 5. Blend: 彩度強調+屈折の上にハイライトを重ねる */}
                <feBlend in="hl-sat" in2="bent" mode="normal" result="merged" />
                <feBlend in="hl-fade" in2="merged" mode="normal" />
              </filter>
            </defs>
          </svg>
          <div
            className="absolute inset-0 ring-1 ring-black/10 dark:ring-white/10"
            style={{
              borderRadius: R,
              backdropFilter: 'url(#glass-refract)',
              WebkitBackdropFilter: 'url(#glass-refract)',
              boxShadow:
                '0 4px 9px rgba(0,0,0,.16), inset 0 2px 24px rgba(0,0,0,.2), inset 0 -2px 24px rgba(255,255,255,.2)',
            }}
          />
        </div>}
      </div>

      {/* ── How it works ── */}
      <article className="mt-12 max-w-3xl space-y-8 text-[15px] leading-[1.8] text-black/80 dark:text-white/80">
        <h2 className="text-xl font-bold tracking-tight text-fg">How it works</h2>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-fg">backdrop-filter で「背面」を加工する</h3>
          <p>
            通常の <code className="rounded bg-black/5 px-1.5 py-0.5 text-[13px] dark:bg-white/10">filter</code> は要素自身の見た目を変えますが、
            <code className="rounded bg-black/5 px-1.5 py-0.5 text-[13px] dark:bg-white/10">backdrop-filter</code> は要素の<em>背後にあるコンテンツ</em>にフィルターを適用します。
            これにより、ガラスパネルの下にあるテキストや画像がリアルタイムで屈折して見えるようになります。
          </p>
          <p>
            CSS の <code className="rounded bg-black/5 px-1.5 py-0.5 text-[13px] dark:bg-white/10">backdrop-filter: url(#glass-refract)</code> で
            インライン SVG 内のフィルターを参照しています。
            SVG フィルターは複数のプリミティブをパイプラインのように連結でき、CSS 単体では不可能な複雑な画像処理が可能になります。
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-fg">フィルターチェーンの構成</h3>
          <p>
            このデモでは 5 つのステップを直列に繋いでいます。
          </p>
          <ol className="list-inside list-decimal space-y-2 pl-2">
            <li>
              <strong>Zoom (feDisplacementMap)</strong> — 中心から外側に向かって軽くピクセルをずらし、レンズ越しに少し拡大したような効果を作ります。
              displacement map のR/Gチャンネルが X/Y 方向のずらし量を決めます。
            </li>
            <li>
              <strong>Refract (feDisplacementMap)</strong> — ベゼル（縁取り）形状の displacement map で、ガラスの縁に沿った屈折を再現します。
              <code className="rounded bg-black/5 px-1.5 py-0.5 text-[13px] dark:bg-white/10">scale=98</code> と大きな値を使うことで、強い歪みを実現しています。
            </li>
            <li>
              <strong>Saturate (feColorMatrix)</strong> — 屈折後のピクセルの彩度を引き上げます。
              実際のガラスは光を分散させて色を鮮やかに見せることがあり、これを模倣しています。
            </li>
            <li>
              <strong>Specular (feComposite + feComponentTransfer)</strong> — 事前に用意したハイライト画像をマスクとして合成し、ガラス表面の光沢感を出します。
              <code className="rounded bg-black/5 px-1.5 py-0.5 text-[13px] dark:bg-white/10">feFuncA</code> で透明度を下げた半透明版も作り、柔らかい光の膜を重ねます。
            </li>
            <li>
              <strong>Blend (feBlend)</strong> — 上記のレイヤーを <code className="rounded bg-black/5 px-1.5 py-0.5 text-[13px] dark:bg-white/10">normal</code> モードで順に合成して最終出力にします。
            </li>
          </ol>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-fg">Displacement Map の仕組み</h3>
          <p>
            <code className="rounded bg-black/5 px-1.5 py-0.5 text-[13px] dark:bg-white/10">feDisplacementMap</code> は、2つ目の入力画像（map）の各ピクセルの色値をもとに、1つ目の入力画像のピクセルをずらします。
            R チャンネルが X 方向、G チャンネルが Y 方向のオフセットに対応します。
          </p>
          <p>
            map 上で <strong>R=128, G=128</strong>（50% グレー）の位置はずれなし、それより大きければ正方向、小さければ負方向に移動します。
            つまり、displacement map を「描く」ことで任意の歪みパターンを自由にデザインできます。
          </p>
          <p>
            このデモでは 3 枚の画像を使っています。
          </p>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li><strong>zoom.png</strong> — 中心から放射状に広がるグラデーションで、レンズの拡大効果を生成</li>
            <li><strong>refract.png</strong> — ベゼル形状のプロファイルで、ガラスの縁の屈折を再現</li>
            <li><strong>highlight.png</strong> — 鏡面反射のハイライトパターン</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-fg">ドラッグの実装</h3>
          <p>
            Pointer Events API を使ったシンプルなドラッグです。
            <code className="rounded bg-black/5 px-1.5 py-0.5 text-[13px] dark:bg-white/10">setPointerCapture</code> でポインターをキャプチャすることで、
            カーソルが要素外に出てもドラッグが途切れません。
            マウスでもタッチでも同じコードで動作します。
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-fg">制約とブラウザ対応</h3>
          <p>
            <code className="rounded bg-black/5 px-1.5 py-0.5 text-[13px] dark:bg-white/10">backdrop-filter: url(#svg-filter)</code> は現在 Chrome / Edge のみ対応しています。
            Firefox は backdrop-filter 自体には対応していますが、SVG フィルターの参照はサポートしていません。
            また、<code className="rounded bg-black/5 px-1.5 py-0.5 text-[13px] dark:bg-white/10">feImage</code> で外部画像を読み込む方式は、フィルターの解像度が要素サイズに固定されるため、
            サイズを動的に変えたい場合は map 画像も合わせて再生成する必要があります。
          </p>
        </section>
      </article>
    </div>
  );
}
