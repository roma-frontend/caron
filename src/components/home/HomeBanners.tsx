'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useSettings } from '@/hooks/useSettings';
import { parseBannerConfig, BANNER_RATIO_CLASS, type BannerConfig } from '@/lib/bannerConfig';
import { PromoTemplate, parsePromoConfig, PROMO_RATIO_CLASS, type PromoTemplateConfig, type PromoRatio } from '@/components/PromoTemplate';

export interface Banner {
  id: string;
  title: string;
  description?: string;
  image: string;
  discountPercent?: number;
  template?: PromoTemplateConfig | null;
}

/**
 * Configurable promo banner carousel. The look (template, ratio, accent,
 * autoplay, overlay, ken-burns, rounded corners) is driven by
 * settings.homeBannerConfig, editable in /settings. Auto-hides when no
 * active promotions have an image.
 */
export function HomeBanners() {
  const promos = useQuery(api.promotions.active, {});
  const settings = useSettings();
  const cfg = parseBannerConfig((settings as { homeBannerConfig?: string } | null | undefined)?.homeBannerConfig);

  const [index, setIndex] = useState(0);

  const banners: Banner[] = (promos ?? [])
    .map((p): Banner | null => {
      const image = p.images?.[0] || p.imageUrl || '';
      const template = parsePromoConfig(p.templateJson);
      if (!image && !template) return null;
      return { id: p._id as string, title: p.title, description: p.description, image, discountPercent: p.discountPercent, template };
    })
    .filter((b): b is Banner => b !== null);

  const count = banners.length;
  const go = useCallback((next: number) => setIndex(count > 0 ? ((next % count) + count) % count : 0), [count]);

  useEffect(() => {
    if (count <= 1 || cfg.autoplay <= 0) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), cfg.autoplay * 1000);
    return () => clearInterval(t);
  }, [count, cfg.autoplay]);

  const current = count > 0 ? Math.min(index, count - 1) : 0;
  const aspect = BANNER_RATIO_CLASS[cfg.ratio];
  const radius = cfg.rounded ? 'rounded-3xl' : '';
  const touchStartX = useRef<number | null>(null);

  if (promos === undefined) {
    return (
      <section className="mx-auto max-w-[var(--container-max)] sm:px-[var(--space-container)] py-[var(--space-8)]">
        <div className={`${aspect} animate-pulse bg-muted ${radius}`} />
      </section>
    );
  }
  if (count === 0) return null;

  return (
    <section className="mx-auto max-w-[var(--container-max)] sm:px-[var(--space-container)] py-[var(--space-8)]">
      <div className={`group relative overflow-hidden border border-border/40 shadow-lg ${radius}`}>
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null || count <= 1) return;
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            if (Math.abs(dx) > 40) go(dx < 0 ? current + 1 : current - 1);
            touchStartX.current = null;
          }}
        >
          {banners.map((b) => (
            <BannerSlide key={b.id} banner={b} cfg={cfg} aspect={aspect} />
          ))}
        </div>

        {count > 1 && (
          <>
            <button onClick={() => go(current - 1)} aria-label="Նախորդ" className="absolute left-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/60 group-hover:opacity-100 sm:flex">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => go(current + 1)} aria-label="Հաջորդ" className="absolute right-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/60 group-hover:opacity-100 sm:flex">
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-2 right-[2%] z-20 flex -translate-x-1/2 items-center">
              {banners.map((b, i) => (
                <button
                  key={b.id}
                  onClick={() => go(i)}
                  aria-label={`Բաններ ${i + 1}`}
                  className="flex h-6 w-6 items-center justify-center"
                >
                  <span
                    className={`h-1.5 rounded-full transition-all ${i === current ? 'w-6' : 'w-1.5 bg-white/50'}`}
                    style={i === current ? { backgroundColor: cfg.accent } : undefined}
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function OverlayText({ banner, cfg, centered }: { banner: Banner; cfg: BannerConfig; centered?: boolean }) {
  return (
    <div className={`absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 px-8 py-5 sm:px-12 sm:py-7 ${centered ? 'items-center text-center' : 'items-start'}`}>
      {banner.discountPercent ? (
        <span className="w-fit rounded-full px-3 py-1 text-xs font-bold text-white shadow-lg sm:text-sm" style={{ backgroundColor: cfg.accent }}>
          -{banner.discountPercent}%
        </span>
      ) : null}
      <h3 className="text-balance text-lg font-black leading-tight text-white drop-shadow-lg sm:text-2xl lg:text-3xl">{banner.title}</h3>
      {banner.description ? (
        <p className={`line-clamp-2 text-balance text-xs text-white/90 drop-shadow sm:text-sm ${centered ? 'max-w-xl' : 'max-w-2xl'}`}>{banner.description}</p>
      ) : null}
    </div>
  );
}

/** Visual layers for a single banner, shared by the carousel and the /settings preview. */
function slideLayers(banner: Banner, cfg: BannerConfig): { extraClass: string; content: React.ReactNode } {
  const sizes = '(max-width: 1280px) 100vw, 1280px';
  const coverImg = `h-full w-full object-cover ${cfg.kenBurns ? 'hero-video' : ''}`;

  // VECTOR TEMPLATE — render the responsive promo template at its own ratio,
  // then apply the global /settings effects (cinematic vignette, spotlight
  // light, ken-burns zoom) on top.
  if (banner.template) {
    const tplRatio = banner.template.bannerRatio ?? (cfg.ratio as PromoRatio);
    return {
      extraClass: cfg.template === 'cinematic' ? 'bg-black' : '',
      content: (
        <>
          <PromoTemplate
            config={banner.template}
            ratio={tplRatio}
            className={`absolute inset-0 h-full w-full ${cfg.kenBurns ? 'hero-video' : ''}`}
          />
          {cfg.template === 'cinematic' && (
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.6) 100%)' }} />
          )}
          {cfg.template === 'spotlight' && (
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: 'radial-gradient(420px circle at var(--sx,50%) var(--sy,50%), rgba(255,255,255,0.18), transparent 70%)' }} />
          )}
          {cfg.template === 'split' && (
            <div
              className="absolute inset-y-0 right-0 flex w-[38%] flex-col items-start justify-center gap-2 p-5 text-white sm:p-7"
              style={{ background: `linear-gradient(135deg, ${cfg.accent}f2, ${cfg.accent}cc)` }}
            >
              {banner.discountPercent ? (
                <span className="w-fit rounded-full bg-white/20 px-3 py-1 text-xs font-bold sm:text-sm">-{banner.discountPercent}%</span>
              ) : null}
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-black sm:text-sm">
                Դիտել <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          )}
        </>
      ),
    };
  }

  if (cfg.template === 'contain') {
    return {
      extraClass: 'bg-muted',
      content: (
        <>
          <Image src={banner.image} alt="" aria-hidden fill sizes={sizes} className="scale-110 object-cover opacity-50 blur-2xl" />
          <Image src={banner.image} alt={banner.title} fill sizes={sizes} className="object-contain" />
          {cfg.overlay && (
            <>
              <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <OverlayText banner={banner} cfg={cfg} />
            </>
          )}
        </>
      ),
    };
  }

  if (cfg.template === 'split') {
    return {
      extraClass: '',
      content: (
        <>
          <Image src={banner.image} alt={banner.title} fill sizes={sizes} className={coverImg} />
          <div
            className="absolute inset-x-0 bottom-0 flex flex-col justify-center gap-2 p-5 text-white sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[42%] sm:p-8"
            style={{ background: `linear-gradient(135deg, ${cfg.accent}f2, ${cfg.accent}cc)` }}
          >
            {banner.discountPercent ? (
              <span className="w-fit rounded-full bg-white/20 px-3 py-1 text-xs font-bold sm:text-sm">-{banner.discountPercent}%</span>
            ) : null}
            <h3 className="text-balance text-lg font-black leading-tight drop-shadow sm:text-2xl lg:text-3xl">{banner.title}</h3>
            {banner.description ? <p className="line-clamp-2 text-balance text-xs text-white/90 sm:text-sm">{banner.description}</p> : null}
            <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-black sm:text-sm">
              Դիտել <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </>
      ),
    };
  }

  if (cfg.template === 'cinematic') {
    return {
      extraClass: 'bg-black',
      content: (
        <>
          <Image src={banner.image} alt={banner.title} fill sizes={sizes} className={coverImg} />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.75) 100%)' }} />
          {cfg.overlay && <OverlayText banner={banner} cfg={cfg} centered />}
        </>
      ),
    };
  }

  if (cfg.template === 'spotlight') {
    return {
      extraClass: '',
      content: (
        <>
          <Image src={banner.image} alt={banner.title} fill sizes={sizes} className={coverImg} />
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: 'radial-gradient(420px circle at var(--sx,50%) var(--sy,50%), rgba(255,255,255,0.18), transparent 70%)' }} />
          {cfg.overlay && (
            <>
              <div className="absolute inset-x-0 bottom-0 top-1/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <OverlayText banner={banner} cfg={cfg} />
            </>
          )}
        </>
      ),
    };
  }

  // COVER (default) — full-bleed image at 100% width & height.
  return {
    extraClass: '',
    content: (
      <>
        <Image src={banner.image} alt={banner.title} fill sizes={sizes} className={coverImg} />
        {cfg.overlay && (
          <>
            <div className="absolute inset-x-0 bottom-0 top-1/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <OverlayText banner={banner} cfg={cfg} />
          </>
        )}
      </>
    ),
  };
}

/**
 * One banner slide. In the carousel it's a Link; in `preview` mode (used by the
 * /settings editor) it renders a non-navigating div.
 */
export function BannerSlide({ banner, cfg, aspect, preview }: { banner: Banner; cfg: BannerConfig; aspect: string; preview?: boolean }) {
  const { extraClass, content } = slideLayers(banner, cfg);
  const slideAspect = banner.template?.bannerRatio ? PROMO_RATIO_CLASS[banner.template.bannerRatio] : aspect;
  const frame = `relative block w-full shrink-0 overflow-hidden ${slideAspect} ${extraClass}`;

  const onMouseMove =
    cfg.template === 'spotlight'
      ? (e: React.MouseEvent<HTMLElement>) => {
          const r = e.currentTarget.getBoundingClientRect();
          e.currentTarget.style.setProperty('--sx', `${e.clientX - r.left}px`);
          e.currentTarget.style.setProperty('--sy', `${e.clientY - r.top}px`);
        }
      : undefined;

  if (preview) {
    return (
      <div className={`group ${frame}`} onMouseMove={onMouseMove}>
        {content}
      </div>
    );
  }

  return (
    <Link href={`/promotions/${banner.id}`} aria-label={banner.title} className={frame} onMouseMove={onMouseMove}>
      {content}
    </Link>
  );
}
