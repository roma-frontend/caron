'use client';

import { useEffect, useState } from 'react';

const PRELOADER_SRC =
  process.env.NEXT_PUBLIC_PRELOADER_VIDEO_URL ||
  'https://pub-21da6611c49e416480be7cc2d42af249.r2.dev/products/preloader.mp4';

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
      <video
        src={PRELOADER_SRC}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        className="pointer-events-none absolute -inset-[10%] -z-30 h-[120%] w-[120%] object-cover opacity-25 blur-3xl saturate-150"
      />
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:72px_72px] opacity-30" />
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_center,transparent_34%,rgba(4,10,18,0.56)_78%),linear-gradient(180deg,rgba(4,10,18,0.06),rgba(4,10,18,0.5))]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-gradient-to-t from-[#07111d] to-transparent" />

      <div className="relative flex w-full flex-col items-center justify-center px-4">
        <div className="absolute h-[min(48vw,30rem)] w-[min(86vw,54rem)] rounded-full bg-primary/20 blur-[90px] animate-[preloaderHalo_2.8s_ease-in-out_infinite]" />
        <div className="absolute h-px w-[min(82vw,58rem)] bg-gradient-to-r from-transparent via-sky-300/70 to-transparent shadow-[0_0_28px_rgba(56,189,248,0.75)] animate-[preloaderBeam_2.2s_ease-in-out_infinite]" />
        <video
          src={PRELOADER_SRC}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          className="pointer-events-none relative w-[min(118vw,76rem)] max-h-[78svh] object-contain opacity-90 drop-shadow-[0_0_90px_rgba(0,102,174,0.5)]"
          style={{
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 24%, rgba(0,0,0,0.76) 42%, rgba(0,0,0,0.28) 60%, transparent 76%)',
            maskImage: 'radial-gradient(ellipse at center, black 24%, rgba(0,0,0,0.76) 42%, rgba(0,0,0,0.28) 60%, transparent 76%)',
          }}
        />
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
