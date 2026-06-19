'use client';

import { useEffect, useState } from 'react';

type PreloaderVideoProps = {
  text?: string;
  fixed?: boolean;
  className?: string;
};

export function PreloaderVideo({ text, fixed = false, className = '' }: PreloaderVideoProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`isolate flex flex-col items-center justify-center overflow-hidden bg-[#07111d] text-white ${fixed ? 'fixed inset-0 z-[9998]' : 'relative min-h-screen py-20'} ${className}`}
    >
      <div className="absolute inset-0 -z-40 bg-[radial-gradient(ellipse_at_50%_35%,rgba(0,102,174,0.32),transparent_45%),radial-gradient(ellipse_at_50%_110%,rgba(14,165,233,0.18),transparent_42%),#050b12]" />
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:72px_72px] opacity-30" />
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_center,transparent_34%,rgba(4,10,18,0.56)_78%),linear-gradient(180deg,rgba(4,10,18,0.06),rgba(4,10,18,0.5))]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-gradient-to-t from-[#07111d] to-transparent" />

      <div className="relative flex w-full flex-col items-center justify-center px-4">
        <div className="absolute h-[min(48vw,30rem)] w-[min(86vw,54rem)] rounded-full bg-primary/20 blur-[90px] animate-[preloaderHalo_2.8s_ease-in-out_infinite]" />
        <div className="absolute h-px w-[min(82vw,58rem)] bg-gradient-to-r from-transparent via-sky-300/70 to-transparent shadow-[0_0_28px_rgba(56,189,248,0.75)] animate-[preloaderBeam_2.2s_ease-in-out_infinite]" />

        {/* Auto-parts themed SVG loader: rotating gear + counter-rotating vented
            brake disc + pulsing lug hub, in the brand gradient. CSS-only. */}
        <div className="caron-stage">
          <svg className="caron-svg" viewBox="0 0 220 220" fill="none" role="img" aria-label="CARON — բեռնվում է">
            <defs>
              <linearGradient id="caronGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#bae6fd" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0066ae" />
              </linearGradient>
              <filter id="caronGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2.2" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Indeterminate progress sweep */}
            <circle
              className="caron-sweep"
              cx="110" cy="110" r="104"
              stroke="url(#caronGrad)" strokeWidth="3" strokeLinecap="round"
              strokeDasharray="150 520" opacity="0.9"
            />

            {/* Main gear (clockwise) */}
            <g className="caron-spin" filter="url(#caronGlow)">
              {Array.from({ length: 12 }, (_, i) => (
                <rect
                  key={`t${i}`}
                  x="104" y="10" width="12" height="20" rx="3"
                  fill="url(#caronGrad)"
                  transform={`rotate(${i * 30} 110 110)`}
                />
              ))}
              <circle cx="110" cy="110" r="72" stroke="url(#caronGrad)" strokeWidth="8" />
            </g>

            {/* Vented brake disc (counter-clockwise) */}
            <g className="caron-spin-rev">
              <circle
                cx="110" cy="110" r="50"
                stroke="url(#caronGrad)" strokeWidth="3"
                strokeDasharray="6 11" opacity="0.85"
              />
              {Array.from({ length: 6 }, (_, i) => (
                <circle
                  key={`v${i}`}
                  cx="110" cy="72" r="4"
                  fill="url(#caronGrad)"
                  transform={`rotate(${i * 60} 110 110)`}
                />
              ))}
            </g>

            {/* Lug hub (pulsing) */}
            <g className="caron-core-pulse">
              <circle cx="110" cy="110" r="22" fill="url(#caronGrad)" opacity="0.16" />
              <circle cx="110" cy="110" r="22" stroke="url(#caronGrad)" strokeWidth="2.5" />
              {Array.from({ length: 5 }, (_, i) => (
                <circle
                  key={`b${i}`}
                  cx="110" cy="95" r="3.5"
                  fill="url(#caronGrad)"
                  transform={`rotate(${i * 72} 110 110)`}
                />
              ))}
              <circle cx="110" cy="110" r="4.5" fill="url(#caronGrad)" />
            </g>
          </svg>

          <div className="flex flex-col items-center gap-3">
            <div className="caron-wordmark" aria-hidden="true">
              {['C', 'A', 'R', 'O', 'N'].map((ch, i) => (
                <span
                  key={ch + i}
                  className="caron-letter"
                  style={{ ['--caron-delay']: `${0.09 * i}s` } as React.CSSProperties}
                >
                  {ch}
                </span>
              ))}
            </div>
            <div className="caron-underline" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-[9svh] flex w-full flex-col items-center gap-4 px-6">
        <div className="h-px w-[min(52vw,24rem)] overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-transparent via-sky-300 to-transparent shadow-[0_0_20px_rgba(56,189,248,0.7)] animate-[preloaderSweep_1.4s_ease-in-out_infinite]" />
        </div>
        {text ? (
          <p className="text-sm font-medium tracking-wide text-white/60">{text}</p>
        ) : (
          <span className="sr-only">Loading</span>
        )}
      </div>
    </div>
  );
}

export function InitialPreloader() {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    let minDone = false;
    let pageDone = document.readyState === 'complete';
    let hidden = false;
    let exitTimer: number | undefined;

    const hide = () => {
      if (hidden) return;
      hidden = true;
      setExiting(true);
      exitTimer = window.setTimeout(() => setVisible(false), 250);
    };

    const maybeHide = () => {
      if (minDone && pageDone) hide();
    };

    const minTimer = window.setTimeout(() => {
      minDone = true;
      maybeHide();
    }, 4300);

    const maxTimer = window.setTimeout(hide, 2500);

    const onLoad = () => {
      pageDone = true;
      maybeHide();
    };

    if (pageDone) {
      maybeHide();
    } else {
      window.addEventListener('load', onLoad, { once: true });
    }

    return () => {
      window.clearTimeout(minTimer);
      window.clearTimeout(maxTimer);
      if (exitTimer) window.clearTimeout(exitTimer);
      window.removeEventListener('load', onLoad);
    };
  }, []);

  if (!visible) return null;

  return (
    <PreloaderVideo
      fixed
      className={`transition-opacity duration-500 ${exiting ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
    />
  );
}
