'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

export { motion, AnimatePresence } from 'framer-motion';
export type { Variants } from 'framer-motion';

/** Hook: reveal element when it enters viewport */
export function useReveal(threshold = 0.1, rootMargin = '0px') {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold, rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { ref, visible };
}

/** Hook: track mouse position relative to element */
export function useMouseGlow() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handlers = {
    onMouseMove: useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }, []),
    onMouseEnter: useCallback(() => setIsHovered(true), []),
    onMouseLeave: useCallback(() => setIsHovered(false), []),
  };

  return { mousePos, isHovered, handlers };
}

/** CSS transition style for reveal animations */
export function revealStyle(_visible: boolean, _delay = 0) {
  return { opacity: 1, transform: 'translateY(0)' } as const;
}

/** CSS transition for card reveal with 3D tilt */
export function cardRevealStyle(_visible: boolean, _delay = 0) {
  return { opacity: 1, transform: 'translateY(0) rotateX(0deg)' } as const;
}
