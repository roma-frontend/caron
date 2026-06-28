'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from '@/components/LocalizedLink';
import Image from 'next/image';
import { X, ArrowRight } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { PromoTemplate, parsePromoConfig, type PromoTemplateConfig } from '@/components/PromoTemplate';
import { useT } from '@/lib/i18n/admin';
import { pickLocalized, pickPromoTemplateJson } from '@/lib/i18n/localize';
import { useCategoryName } from '@/lib/i18n/filterNames';

interface Story {
  id: string;
  title: string;
  image: string | null;
  href: string;
  template?: PromoTemplateConfig | null;
}

const STORY_DURATION = 6000;

/**
 * Instagram-style circular stories (WB/OZON pattern). Sourced from active
 * promotions + top categories. Tapping opens a fullscreen auto-advancing
 * viewer. Auto-hides when there is nothing to show.
 */
export function HomeStories() {
  const { lang } = useT();
  const catName = useCategoryName();
  const promos = useQuery(api.promotions.active, {});
  const categories = useQuery(api.categories.list, {});

  const stories: Story[] = [
    ...(promos ?? [])
      .map((p): Story | null => {
        const image = p.images?.[0] || p.imageUrl || null;
        const template = parsePromoConfig(pickPromoTemplateJson(p, lang));
        return { id: `promo-${p._id}`, title: pickLocalized(p, 'title', lang), image, template, href: `/promotions/${p._id}` };
      })
      .filter((s): s is Story => s !== null),
    ...(categories ?? []).slice(0, 8).map((c): Story => ({
      id: `cat-${c._id}`,
      title: catName(c),
      image: c.imageUrl || null,
      href: `/categories/${c.slug}`,
    })),
  ];

  const [open, setOpen] = useState<number | null>(null);

  if (promos === undefined || categories === undefined) return null;
  if (stories.length === 0) return null;

  return (
    <section className="mx-auto max-w-[var(--container-max)] px-1 sm:px-[var(--space-container)] py-[var(--space-6)]">
      <div className="scrollbar-none -mx-1 flex gap-4 overflow-x-auto overscroll-x-contain px-1 pb-1">
        {stories.map((s, i) => (
          <button key={s.id} onClick={() => setOpen(i)} className="flex w-[75px] shrink-0 flex-col items-center gap-1.5">
            <span className="rounded-full bg-gradient-to-tr from-primary via-blue-400 to-orange-400 p-[2.5px]">
              <span className="block rounded-full bg-background p-[2px]">
                <span className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-muted">
                  {s.image ? (
                    <Image src={s.image} alt={s.title} fill sizes="64px" className="object-cover" />
                  ) : s.template ? (
                    <PromoTemplate config={s.template} ratio="1/1" className="h-full w-full" />
                  ) : (
                    <span className="text-xl font-black text-primary">{s.title.charAt(0)}</span>
                  )}
                </span>
              </span>
            </span>
            <span className="line-clamp-2 text-center text-[11px] leading-tight text-muted-foreground">{s.title}</span>
          </button>
        ))}
      </div>

      {open !== null && (
        <StoryViewer
          stories={stories}
          startIndex={open}
          onClose={() => setOpen(null)}
        />
      )}
    </section>
  );
}

function StoryViewer({ stories, startIndex, onClose }: { stories: Story[]; startIndex: number; onClose: () => void }) {
  const { t } = useT();
  const [index, setIndex] = useState(startIndex);
  const story = stories[index];

  const next = useCallback(() => {
    setIndex((i) => {
      if (i + 1 >= stories.length) { onClose(); return i; }
      return i + 1;
    });
  }, [stories.length, onClose]);

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // Auto-advance progress.
  useEffect(() => {
    const t = setTimeout(next, STORY_DURATION);
    return () => clearTimeout(t);
  }, [index, next]);

  // Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90" style={{ animation: 'fadeIn 0.2s ease' }}>
      {/* Progress bars */}
      <div className="absolute inset-x-0 top-0 z-20 flex gap-1 p-3">
        {stories.map((s, i) => (
          <div key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
            <div
              className="h-full bg-white"
              style={
                i < index
                  ? { width: '100%' }
                  : i === index
                    ? { width: '0%', animation: `storyFill ${STORY_DURATION}ms linear forwards` }
                    : { width: '0%' }
              }
            />
          </div>
        ))}
      </div>

      <button onClick={onClose} aria-label={t('pg.common.close')} className="absolute right-3 top-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
        <X className="h-5 w-5" />
      </button>

      {/* Tap zones */}
      <button onClick={prev} aria-label={t('pg.common.prev')} className="absolute left-0 top-0 z-10 h-full w-1/3" />
      <button onClick={next} aria-label={t('pg.common.next')} className="absolute right-0 top-0 z-10 h-full w-1/3" />

      {/* Content */}
      <div className="relative flex h-full max-h-[90vh] w-full max-w-md flex-col justify-end overflow-hidden sm:rounded-2xl">
        {story.image ? (
          <Image src={story.image} alt={story.title} fill sizes="448px" className="object-cover" />
        ) : story.template ? (
          <div className="absolute inset-x-0 top-0 aspect-square overflow-hidden">
            <PromoTemplate config={story.template} ratio={story.template.cardRatio ?? '1/1'} className="h-full w-full" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-blue-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
        <div className="relative z-10 flex flex-col gap-3 p-6 pb-10">
          <h3 className="text-balance text-2xl font-black text-white drop-shadow">{story.title}</h3>
          <Link
            href={story.href}
            onClick={onClose}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black transition-transform hover:scale-105"
          >
            {t('pg.common.view')} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
