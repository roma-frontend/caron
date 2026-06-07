'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
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
}

const ZOOM_SIZE = 320;

function updateZoom(
  container: HTMLDivElement,
  clientX: number,
  clientY: number,
  src: string,
  setLensStyle: (s: React.CSSProperties) => void,
  setZoomStyle: (s: React.CSSProperties) => void,
) {
  const rect = container.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const xRatio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  const yRatio = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
  const scale = 2.5;
  const bgW = rect.width * scale;
  const bgH = rect.height * scale;
  const lensSize = 100;

  setLensStyle({
    display: 'block',
    left: xRatio * rect.width - lensSize / 2,
    top: yRatio * rect.height - lensSize / 2,
    width: lensSize,
    height: lensSize,
  });

  const cursorX = xRatio * rect.width;
  const cursorY = yRatio * rect.height;
  const bgX = -(cursorX * scale - ZOOM_SIZE / 2);
  const bgY = -(cursorY * scale - ZOOM_SIZE / 2);

  const spaceRight = window.innerWidth - rect.right;
  const showOnRight = spaceRight >= ZOOM_SIZE + 16;

  setZoomStyle({
    display: 'block',
    position: 'fixed',
    left: showOnRight ? rect.right + 16 : Math.max(8, rect.left),
    top: rect.top,
    width: ZOOM_SIZE,
    height: ZOOM_SIZE,
    backgroundImage: `url(${src})`,
    backgroundSize: `${bgW}px ${bgH}px`,
    backgroundPosition: `${bgX}px ${bgY}px`,
    backgroundRepeat: 'no-repeat',
  });
}

export function ProductImageZoom({ src, alt, width, height, priority, sizes, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMouse = useRef({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [lensStyle, setLensStyle] = useState<React.CSSProperties>({ display: 'none' });
  const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({ display: 'none' });

  useEffect(() => { setMounted(true); }, []);

  const doUpdate = useCallback((e: { clientX: number; clientY: number }) => {
    if (!containerRef.current) return;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    updateZoom(containerRef.current, e.clientX, e.clientY, src, setLensStyle, setZoomStyle);
  }, [src]);

  const refresh = useCallback(() => {
    if (!hovering || !containerRef.current) return;
    updateZoom(containerRef.current, lastMouse.current.x, lastMouse.current.y, src, setLensStyle, setZoomStyle);
  }, [hovering, src]);

  useEffect(() => {
    if (!hovering) return;
    window.addEventListener('scroll', refresh, { passive: true });
    window.addEventListener('resize', refresh, { passive: true });
    return () => {
      window.removeEventListener('scroll', refresh);
      window.removeEventListener('resize', refresh);
    };
  }, [hovering, refresh]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    doUpdate(e);
  }, [doUpdate]);

  const handleMouseEnter = useCallback(() => setHovering(true), []);

  const handleMouseLeave = useCallback(() => {
    setHovering(false);
    setLensStyle({ display: 'none' });
    setZoomStyle({ display: 'none' });
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        className={`relative overflow-hidden cursor-crosshair ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <Image
          src={src} alt={alt} width={width} height={height}
          priority={priority} sizes={sizes}
          className="h-full w-full object-cover select-none pointer-events-none"
          draggable={false}
        />
        {/* Dim overlay when zoom active */}
        {hovering && (
          <div className="pointer-events-none absolute inset-0 bg-black/30 transition-opacity" />
        )}
        {/* Lens highlight */}
        <div className="pointer-events-none absolute rounded-lg border-2 border-primary/50 bg-primary/10" style={lensStyle} />
      </div>

      {mounted &&
        createPortal(
          <div
            className="pointer-events-none rounded-xl border-2 border-border bg-background shadow-2xl bg-no-repeat"
            style={zoomStyle}
          />,
          document.body,
        )}
    </>
  );
}
