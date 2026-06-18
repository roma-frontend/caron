'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
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

const ZOOM_SIZE = 300;
const SCALE = 2.5;
const LENS_SIZE = 110;

const noop = () => () => {};

function toZoomImageSrc(src: string): string {
  // Reuse Next's optimizer endpoint to avoid client-side remote fetch edge cases in CSS backgrounds.
  if (src.startsWith('data:') || src.startsWith('/_next/image?')) return src;
  // Use allowed optimizer params (see next.config images.deviceSizes/imageSizes).
  return `/_next/image?url=${encodeURIComponent(src)}&w=1200&q=75`;
}

export function ProductImageZoom({ src, alt, width, height, priority, sizes, className = '', fit = 'cover' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dimRef = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLDivElement | null>(null);
  const zoomImgRef = useRef<HTMLImageElement | null>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const active = useRef(false);
  const rafId = useRef(0);
  const isMobile = useRef(true);
  const renderFn = useRef<() => void>(() => {});
  const [failedOptimizedFor, setFailedOptimizedFor] = useState<string | null>(null);
  const optimizedSrc = toZoomImageSrc(src);
  const zoomSrc = failedOptimizedFor === src ? src : optimizedSrc;

  // true only on client, avoids setState-in-effect warning
  const mounted = useSyncExternalStore(noop, () => true, () => false);

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
    const zoom = zoomRef.current;
    const zoomImg = zoomImgRef.current;
    if (!c) { rafId.current = requestAnimationFrame(renderFn.current); return; }

    const rect = c.getBoundingClientRect();
    if (rect.width < 10) { rafId.current = requestAnimationFrame(renderFn.current); return; }

    const mx = mouse.current.x;
    const my = mouse.current.y;
    const xR = Math.max(0, Math.min(1, (mx - rect.left) / rect.width));
    const yR = Math.max(0, Math.min(1, (my - rect.top) / rect.height));

    const lx = xR * rect.width - LENS_SIZE / 2;
    const ly = yR * rect.height - LENS_SIZE / 2;

    if (lens) {
      lens.style.display = 'block';
      lens.style.left = `${lx}px`;
      lens.style.top = `${ly}px`;
      lens.style.width = `${LENS_SIZE}px`;
      lens.style.height = `${LENS_SIZE}px`;
    }

    if (zoom && zoomImg) {
      const cx = xR * rect.width;
      const cy = yR * rect.height;
      const bw = rect.width * SCALE;
      const bh = rect.height * SCALE;
      const bx = -(cx * SCALE - ZOOM_SIZE / 2);
      const by = -(cy * SCALE - ZOOM_SIZE / 2);
      const roomRight = window.innerWidth - rect.right;
      const onRight = roomRight >= ZOOM_SIZE + 16;
      const panelTop = Math.max(64, Math.min(rect.top, window.innerHeight - ZOOM_SIZE - 8));
      const panelLeft = onRight ? rect.right + 16 : Math.max(8, rect.left);

      zoom.style.display = 'block';
      zoom.style.position = 'fixed';
      zoom.style.zIndex = '9999';
      zoom.style.left = `${panelLeft}px`;
      zoom.style.top = `${panelTop}px`;
      zoom.style.width = `${ZOOM_SIZE}px`;
      zoom.style.height = `${ZOOM_SIZE}px`;

      zoomImg.style.width = `${bw}px`;
      zoomImg.style.height = `${bh}px`;
      zoomImg.style.transform = `translate(${bx}px, ${by}px)`;
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
    if (zoomRef.current) zoomRef.current.style.display = 'none';
  }, []);

  return (
    <>
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
        <div ref={dimRef} className="pointer-events-none absolute inset-0 bg-black/30" style={{ display: 'none' }} />
        <div ref={lensRef} className="pointer-events-none absolute z-10 rounded-lg border-2 border-primary bg-primary/10" style={{ display: 'none' }} />
      </div>
      {mounted &&
        createPortal(
          <div ref={(el) => { zoomRef.current = el; }} className="pointer-events-none overflow-hidden rounded-xl border-2 border-border bg-background shadow-2xl" style={{ display: 'none' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={zoomImgRef}
              src={zoomSrc}
              alt=""
              className="absolute left-0 top-0 max-w-none select-none"
              draggable={false}
              onError={() => {
                if (zoomSrc !== src) setFailedOptimizedFor(src);
              }}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
