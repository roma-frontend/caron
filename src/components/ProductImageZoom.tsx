'use client';

import { useCallback, useRef, useState } from 'react';
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

const ZOOM_SIZE = 288; // w-72

export function ProductImageZoom({ src, alt, width, height, priority, sizes, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lensStyle, setLensStyle] = useState<React.CSSProperties>({ display: 'none' });
  const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({ display: 'none' });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;
    const lensSize = 120;

    const lensLeft = Math.max(0, Math.min(rect.width - lensSize, e.clientX - rect.left - lensSize / 2));
    const lensTop = Math.max(0, Math.min(rect.height - lensSize, e.clientY - rect.top - lensSize / 2));

    setLensStyle({
      display: 'block',
      left: lensLeft,
      top: lensTop,
      width: lensSize,
      height: lensSize,
    });

    // Position zoom panel to the right of the image on desktop, or below on narrow screens
    const spaceRight = window.innerWidth - rect.right;
    const showOnRight = spaceRight >= ZOOM_SIZE + 16;
    const zoomLeft = showOnRight ? rect.right + 16 : Math.max(8, rect.left);
    const zoomTop = showOnRight ? rect.top : rect.bottom + 8;

    setZoomStyle({
      display: 'block',
      position: 'fixed',
      left: zoomLeft,
      top: zoomTop,
      width: ZOOM_SIZE,
      height: ZOOM_SIZE,
      backgroundImage: `url(${src})`,
      backgroundSize: `${rect.width * 2.5}px ${rect.height * 2.5}px`,
      backgroundPosition: `${-xRatio * 100 * 2.5 + 50}% ${-yRatio * 100 * 2.5 + 50}%`,
      backgroundRepeat: 'no-repeat',
    });
  }, [src]);

  const handleMouseLeave = useCallback(() => {
    setLensStyle({ display: 'none' });
    setZoomStyle({ display: 'none' });
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden cursor-crosshair ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <Image src={src} alt={alt} width={width} height={height} priority={priority} sizes={sizes} className="h-full w-full object-cover select-none" draggable={false} />
      <div className="pointer-events-none absolute rounded-lg border-2 border-primary/50 bg-primary/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.3)]" style={lensStyle} />
      <div className="pointer-events-none rounded-xl border-2 border-border bg-background shadow-2xl bg-no-repeat" style={zoomStyle} />
    </div>
  );
}
