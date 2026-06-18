'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface Props {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  sizes?: string;
  className?: string;
  fit?: 'cover' | 'contain';
}

const SCALE = 2.5;
const LENS_WIDTH = 110;
const LENS_HEIGHT = 132;

function toZoomImageSrc(src: string): string {
  // Reuse Next optimizer to keep zoom source reliable for remote images.
  if (src.startsWith('data:') || src.startsWith('/_next/image?')) return src;
  return `/_next/image?url=${encodeURIComponent(src)}&w=1200&q=75`;
}

export function ProductImageZoom({ src, alt, width, height, priority, sizes, className = '', fit = 'cover' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dimRef = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const lensImgRef = useRef<HTMLImageElement>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const active = useRef(false);
  const rafId = useRef(0);
  const isMobile = useRef(true);
  const renderFn = useRef<() => void>(() => {});
  const [failedOptimizedFor, setFailedOptimizedFor] = useState<string | null>(null);
  const optimizedSrc = toZoomImageSrc(src);
  const zoomSrc = failedOptimizedFor === src ? src : optimizedSrc;

  const checkMobile = () => {
    // Enable zoom only on devices that actually have mouse-like hover precision AND a wide enough viewport.
    isMobile.current =
      !window.matchMedia('(hover: hover) and (pointer: fine)').matches ||
      window.innerWidth < 1024;
  };

  useEffect(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Plain function — assigned to ref via useEffect (avoids render-time ref write)
  const render = () => {
    if (!active.current || isMobile.current) return;
    const c = containerRef.current;
    const lens = lensRef.current;
    const lensImg = lensImgRef.current;
    if (!c) { rafId.current = requestAnimationFrame(renderFn.current); return; }

    const rect = c.getBoundingClientRect();
    if (rect.width < 10) { rafId.current = requestAnimationFrame(renderFn.current); return; }

    const mx = mouse.current.x;
    const my = mouse.current.y;
    const xR = Math.max(0, Math.min(1, (mx - rect.left) / rect.width));
    const yR = Math.max(0, Math.min(1, (my - rect.top) / rect.height));

    const lx = Math.max(0, Math.min(rect.width - LENS_WIDTH, xR * rect.width - LENS_WIDTH / 2));
    const ly = Math.max(0, Math.min(rect.height - LENS_HEIGHT, yR * rect.height - LENS_HEIGHT / 2));

    if (lens) {
      lens.style.display = 'block';
      lens.style.left = `${lx}px`;
      lens.style.top = `${ly}px`;
      lens.style.width = `${LENS_WIDTH}px`;
      lens.style.height = `${LENS_HEIGHT}px`;
    }

    if (lensImg) {
      const scaledW = rect.width * SCALE;
      const scaledH = rect.height * SCALE;
      lensImg.style.width = `${scaledW}px`;
      lensImg.style.height = `${scaledH}px`;
      lensImg.style.left = `${-(xR * scaledW - LENS_WIDTH / 2)}px`;
      lensImg.style.top = `${-(yR * scaledH - LENS_HEIGHT / 2)}px`;
    }

    rafId.current = requestAnimationFrame(renderFn.current);
  };

  // Sync render fn into ref (allowed in useEffect)
  useEffect(() => {
    renderFn.current = render;
  });

  const onEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile.current) return;
    cancelAnimationFrame(rafId.current);
    active.current = true;
    mouse.current = { x: e.clientX, y: e.clientY };
    if (dimRef.current) dimRef.current.style.display = 'block';
    rafId.current = requestAnimationFrame(renderFn.current);
  }, []);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile.current) return;
    mouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onLeave = useCallback(() => {
    active.current = false;
    cancelAnimationFrame(rafId.current);
    if (dimRef.current) dimRef.current.style.display = 'none';
    if (lensRef.current) lensRef.current.style.display = 'none';
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden max-lg:cursor-default cursor-crosshair ${className}`}
      onMouseEnter={onEnter}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <Image
        src={src} alt={alt} width={width} height={height}
        priority={priority} sizes={sizes}
        className={`h-full w-full ${fit === 'contain' ? 'object-contain' : 'object-cover'} select-none pointer-events-none`}
        draggable={false}
      />
      <div ref={dimRef} className="pointer-events-none absolute inset-0 bg-black/20" style={{ display: 'none' }} />
      <div
        ref={lensRef}
        className="pointer-events-none absolute z-10 overflow-hidden rounded-lg border-2 border-primary shadow-lg"
        style={{ display: 'none' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={lensImgRef}
          src={zoomSrc}
          alt=""
          className="absolute max-w-none select-none"
          draggable={false}
          onError={() => {
            if (zoomSrc !== src) setFailedOptimizedFor(src);
          }}
        />
      </div>
    </div>
  );
}
