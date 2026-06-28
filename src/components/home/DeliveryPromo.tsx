'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import Image from 'next/image';
import Link from '@/components/LocalizedLink';
import { Truck, ArrowRight } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { normalizeImageUrl } from '../../../convex/lib/imageUrl';
import { useT } from '@/lib/i18n/admin';

/** How often the 6 random images rotate. 3_600_000 = 1 hour. (10_000 = 10s for testing) */
const ROTATE_MS = 3_600_000;

/** Deterministic PRNG (mulberry32) — same seed → same sequence. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded Fisher–Yates shuffle — stable for a given seed. */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  const rand = mulberry32(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * WB/OZON-style delivery promo strip. Pulls REAL product images from the whole
 * catalog and shows 6 random ones as side accents. The selection is seeded by
 * the current hour, so it rotates every hour but stays stable across re-renders
 * (and SSR/CSR) within the same hour. Brand-blue gradient, Armenian copy.
 */
export function DeliveryPromo() {
  const { t } = useT();
  // Time bucket as the random seed. Rotates every ROTATE_MS.
  const [hourSeed, setHourSeed] = useState(() => Math.floor(Date.now() / ROTATE_MS));

  useEffect(() => {
    const id = setInterval(() => setHourSeed(Math.floor(Date.now() / ROTATE_MS)), ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  // Pull a broad pool of active products to randomize across.
  const products = useQuery(api.products.listCards, { limit: 100 });

  const images = useMemo(() => {
    const pool = (products ?? [])
      .map((p) => normalizeImageUrl(p.images?.[0]))
      .filter((src): src is string => Boolean(src));
    // De-duplicate so the strip never shows the same picture twice.
    const unique = Array.from(new Set(pool));
    return seededShuffle(unique, hourSeed).slice(0, 6);
  }, [products, hourSeed]);

  // Need at least 2 images for a clean layout.
  if (products !== undefined && images.length < 2) return null;

  const left = images.slice(0, 3);
  const right = images.slice(3, 6);

  return (
    <section className="mx-auto max-w-[var(--container-max)] px-0 sm:px-[var(--space-container)] pb-[var(--space-section)]">
      <Link href="/delivery" className="group block">
        <div className="relative overflow-hidden rounded-none sm:rounded-2xl bg-gradient-to-r from-primary via-[#0a78c9] to-[#0b5ed7] shadow-lg">
          {/* Subtle radial sheen */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.18),transparent_60%)]" />

          <div className="relative flex items-stretch justify-between p-2">
            {/* Left product images */}
            <div className="hidden md:flex items-center gap-0 pl-4 lg:pl-6 shrink-0">
              {left.map((src, i) => (
                <div
                  key={`${src}-${i}`}
                  className="relative h-[64px] w-[64px] lg:h-[80px] lg:w-[80px] -ml-3 first:ml-0 rounded-xl bg-white/95 p-1.5 shadow-md ring-1 ring-black/5 transition-transform duration-300 group-hover:-translate-y-0.5"
                  style={{ transform: `rotate(${(i - 1) * 5}deg)` }}
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-contain p-1"
                    aria-hidden="true"
                  />
                </div>
              ))}
            </div>

            {/* Center message */}
            <div className="flex flex-1 items-center justify-center gap-2 sm:gap-3 px-4 py-3 sm:py-4 text-center">
              <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-white shrink-0" />
              <span className="text-sm sm:text-lg lg:text-xl font-extrabold text-white tracking-tight">
                {t('sx.delivery.fastTitle')}
              </span>
              <span className="shrink-0 rounded-md bg-yellow-400 px-2 py-0.5 text-[10px] sm:text-xs font-extrabold text-gray-900 uppercase tracking-wide shadow-md">
                {t('sx.delivery.details')}
              </span>
              <ArrowRight className="hidden sm:block h-5 w-5 text-white/80 transition-transform group-hover:translate-x-1" />
            </div>

            {/* Right product images */}
            <div className="hidden md:flex items-center gap-0 pr-4 lg:pr-6 shrink-0">
              {right.map((src, i) => (
                <div
                  key={`${src}-${i}`}
                  className="relative h-[64px] w-[64px] lg:h-[80px] lg:w-[80px] -ml-3 first:ml-0 rounded-xl bg-white/95 p-1.5 shadow-md ring-1 ring-black/5 transition-transform duration-300 group-hover:-translate-y-0.5"
                  style={{ transform: `rotate(${(i - 1) * -5}deg)` }}
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-contain p-1"
                    aria-hidden="true"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Link>
    </section>
  );
}
