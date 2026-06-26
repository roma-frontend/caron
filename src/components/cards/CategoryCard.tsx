'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Disc3, CircleDot, Droplet, Filter, Lightbulb, BatteryCharging, Wrench, Gauge, Package, ChevronRight } from 'lucide-react';
import { useMouseGlow } from '@/lib/motion';
import Image from 'next/image';
import { useT } from '@/lib/i18n/admin';
import { useCategoryName } from '@/lib/i18n/filterNames';
import { pickLocalized } from '@/lib/i18n/localize';

interface CategoryCardProps {
  id: string;
  name: string;
  nameRu?: string;
  nameEn?: string;
  slug: string;
  description?: string;
  descriptionRu?: string;
  descriptionEn?: string;
  imageUrl?: string | null;
  productCount?: number;
  index?: number;
  className?: string;
}

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  tires: Disc3,
  discs: CircleDot,
  oils: Droplet,
  filters: Filter,
  brakes: Gauge,
  lamps: Lightbulb,
  batteries: BatteryCharging,
  accessories: Wrench,
};

export const CATEGORY_COLORS: Record<string, string> = {
  tires: 'bg-slate-500/15 text-slate-600 dark:text-slate-300',
  discs: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  oils: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  filters: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  brakes: 'bg-red-500/15 text-red-600 dark:text-red-400',
  lamps: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
  batteries: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  accessories: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
};

const CATEGORY_GLOW_COLORS: Record<string, string> = {
  tires: 'oklch(0.6 0.05 250 / 0.15)',
  discs: 'oklch(0.65 0.12 220 / 0.18)',
  oils: 'oklch(0.75 0.14 80 / 0.18)',
  filters: 'oklch(0.6 0.14 248 / 0.18)',
  brakes: 'oklch(0.6 0.18 25 / 0.18)',
  lamps: 'oklch(0.8 0.15 90 / 0.2)',
  batteries: 'oklch(0.65 0.15 160 / 0.18)',
  accessories: 'oklch(0.6 0.14 300 / 0.18)',
};

export function CategoryCard({ name, nameRu, nameEn, slug, description, descriptionRu, descriptionEn, imageUrl, productCount, index: _index = 0, className }: CategoryCardProps) {
  const { t, lang } = useT();
  const categoryName = useCategoryName();
  const displayName = categoryName({ name, slug, nameRu, nameEn });
  const displayDesc = pickLocalized({ description, descriptionRu, descriptionEn }, 'description', lang);
  const { mousePos, isHovered, handlers } = useMouseGlow();
  const Icon = CATEGORY_ICONS[slug] ?? Package;
  const color = CATEGORY_COLORS[slug] ?? 'bg-primary/10 text-primary';
  const glowColor = CATEGORY_GLOW_COLORS[slug] ?? 'oklch(0.6 0.14 248 / 0.15)';

  return (
    <Link href={`/categories/${slug}`} className={className}>
      <div
        {...handlers}
        className="group relative flex flex-col sm:flex-row h-full items-start sm:items-center gap-4 overflow-hidden rounded-2xl border bg-card/80 backdrop-blur-sm p-5 card-modern"
        style={{
          transition: 'transform 0.4s cubic-bezier(0.22,1,0.36,1), box-shadow 0.4s ease, border-color 0.4s cubic-bezier(0.22,1,0.36,1)',
          transform: isHovered
            ? `translateY(-6px) scale(1.01) perspective(800px) rotateX(${(mousePos.y - 40) / -40}deg) rotateY(${(mousePos.x - 150) / 40}deg)`
            : 'translateY(0) scale(1) perspective(800px) rotateX(0deg) rotateY(0deg)',
          boxShadow: isHovered ? 'var(--shadow-card-hover)' : 'var(--shadow-card)',
        }}
      >
        {/* Mouse-follow radial glow — category-specific color */}
        {isHovered && (
          <div
            className="pointer-events-none absolute inset-0 -z-10 rounded-2xl"
            style={{
              background: `radial-gradient(350px circle at ${mousePos.x}px ${mousePos.y}px, ${glowColor}, transparent 60%)`,
              filter: 'blur(25px)',
            }}
          />
        )}

        {/* Accent line on left edge */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: `linear-gradient(to bottom, ${glowColor.replace(/\/ [\d.]+\)/, '/ 0.8)')}, transparent)` }}
        />

        {imageUrl ? (
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl">
            <Image src={imageUrl} alt={name} width={56} height={56} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
          </div>
        ) : (
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-md ${color}`}>
            <Icon className="h-7 w-7 transition-transform duration-300 group-hover:rotate-6" strokeWidth={1.75} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-tight transition-colors duration-200 group-hover:text-primary">{displayName}</h3>
          {productCount !== undefined ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{productCount} {t('sx.itemsWord')}</p>
          ) : displayDesc ? (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{displayDesc}</p>
          ) : null}
        </div>

        <ChevronRight className="hidden sm:block h-5 w-5 shrink-0 text-muted-foreground/50 transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary" />
      </div>
    </Link>
  );
}
