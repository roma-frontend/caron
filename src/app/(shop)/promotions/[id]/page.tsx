'use client';

import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/ui/loader';
import { ProductCard } from '@/components/cards/ProductCard';
import { PromoTemplate, parsePromoConfig, PROMO_RATIO_CLASS } from '@/components/PromoTemplate';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Clock, Percent, Calendar, ArrowLeft, Tag, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDateLocalized } from '@/lib/formatters';
import { Id } from '../../../../../convex/_generated/dataModel';
import Image from 'next/image';
import Link from '@/components/LocalizedLink';
import { useState, useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { useT } from '@/lib/i18n/admin';
import { pickLocalized, pickPromoTemplateJson } from '@/lib/i18n/localize';

function Countdown({ endDate }: { endDate: number }) {
  const { t } = useT();
  const [now] = useState(() => Date.now());
  const diff = Math.max(0, endDate - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="flex gap-2">
      {[{ v: days, l: t('sx.promo.unitDays') }, { v: hours, l: t('sx.promo.unitHours') }, { v: mins, l: t('sx.promo.unitMins') }].map((item) => (
        <div key={item.l} className="flex min-w-[56px] flex-col items-center rounded-xl bg-background/80 px-3 py-2 backdrop-blur-sm">
          <span className="text-xl font-black tabular-nums">{String(item.v).padStart(2, '0')}</span>
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{item.l}</span>
        </div>
      ))}
    </div>
  );
}

function ProgressBar({ start, end }: { start: number; end: number }) {
  const [now] = useState(() => Date.now());
  const total = end - start;
  const elapsed = now - start;
  const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
  if (now < start || now > end) return null;
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all duration-1000" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-medium text-muted-foreground tabular-nums">{Math.round(pct)}%</span>
    </div>
  );
}

export default function PromotionDetailPage() {
  const { t, lang } = useT();
  const { id } = useParams();
  const promotions = useQuery(api.promotions.active, {});
  const products = useQuery(api.products.listCards, { limit: 500 });
  const promo = promotions?.find((p) => p._id === id);

  const [now] = useState(() => Date.now());
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);

  if (promotions === undefined) return <Loader />;
  if (!promo) return <div className="py-20 text-center text-muted-foreground">{t('sx.promo.notFound')}</div>;

  const daysLeft = Math.max(0, Math.ceil((promo.endDate - now) / 86400000));
  const isExpired = promo.endDate < now;
  const isUpcoming = promo.startDate > now;
  const isLive = !isExpired && !isUpcoming;

  const promoProducts = products?.filter((p) => {
    if (promo.productIds && promo.productIds.length > 0) return promo.productIds.includes(p._id as Id<'products'>);
    if (promo.categoryIds && promo.categoryIds.length > 0) return promo.categoryIds.includes(p.categoryId as Id<'categories'>);
    return false;
  }) ?? [];

  const images = (promo.images ?? (promo.imageUrl ? [promo.imageUrl] : [])) as string[];
  const tpl = parsePromoConfig(pickPromoTemplateJson(promo, lang));
  const promoTitle = pickLocalized(promo, 'title', lang);
  const promoDescription = pickLocalized(promo, 'description', lang);

  return (
    <div className="mx-auto max-w-[var(--container-max)] sm:px-[var(--space-container)] py-[var(--space-8)]">
      <Breadcrumbs items={[{ label: t('sx.promo.breadcrumb'), href: '/promotions' }, { label: promoTitle }]} />

      {/* Hero with image carousel */}
      <div className="relative mt-4 overflow-hidden rounded-2xl border bg-gradient-to-b from-muted/30 to-muted/10">
        {/* Carousel area */}
        <div className={`relative mx-auto w-full overflow-hidden ${tpl ? PROMO_RATIO_CLASS[tpl.bannerRatio ?? '16/5'] : 'flex aspect-[21/9] max-h-[400px] items-center justify-center p-5 sm:p-8'}`}>
          {tpl ? (
            <PromoTemplate config={tpl} ratio={tpl.bannerRatio ?? '16/5'} className="absolute inset-0 h-full w-full" />
          ) : images.length > 0 ? (
            <>
              {/* Blurred backdrop */}
              <div className="absolute inset-0 -z-10 scale-110 overflow-hidden opacity-30">
                <Image src={images[selectedIndex]} alt="" fill className="object-cover blur-xl" sizes="100vw" />
              </div>

              {/* Embla carousel */}
              <div ref={emblaRef} className="h-full w-full overflow-hidden">
                <div className="flex h-full">
                  {images.map((img, i) => (
                    <div key={i} className="relative flex min-w-0 flex-[0_0_100%] items-center justify-center">
                      <div className="relative h-full w-full max-w-[512px] overflow-hidden rounded-2xl bg-card shadow-xl ring-1 ring-black/[0.04]">
                        <Image
                          src={img}
                          alt=""
                          fill
                          priority={i === 0}
                          sizes="(max-width: 640px) 100vw, 512px"
                          className="object-contain p-3"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nav arrows */}
              {images.length > 1 && (
                <>
                  <button onClick={() => emblaApi?.scrollPrev()} className="absolute left-7 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 shadow-sm backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => emblaApi?.scrollNext()} className="absolute right-7 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 shadow-sm backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}

              {/* Dots */}
              {images.length > 1 && (
                <div className="absolute bottom-7 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
                  {images.map((_, i) => (
                    <button key={i} onClick={() => emblaApi?.scrollTo(i)} className={`h-1.5 rounded-full transition-all duration-300 ${i === selectedIndex ? 'w-5 bg-primary' : 'w-1.5 bg-background/60 hover:bg-background/90'}`} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <Percent className="h-24 w-24 text-primary/10" strokeWidth={1} />
            </div>
          )}

          {/* Back button */}
          <Link href="/promotions" className="absolute left-5 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/70 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>

          {/* Badges */}
          <div className="absolute right-5 top-5 z-10 flex flex-wrap gap-2">
            {!!promo.discountPercent && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-4 py-1.5 text-sm font-black text-white shadow-lg">
                <Tag className="h-3.5 w-3.5" /> -{promo.discountPercent}%
              </span>
            )}
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-sm backdrop-blur-sm ${
              isExpired ? 'bg-muted/80 text-muted-foreground' : isUpcoming ? 'bg-blue-500/80 text-white' : 'bg-green-500/80 text-white'
            }`}>
              {isExpired ? t('sx.promo.expired') : isUpcoming ? t('sx.promo.upcoming') : t('sx.promo.active')}
            </span>
          </div>
        </div>

        {/* Info strip */}
        <div className="border-t px-6 py-5 sm:px-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{promoTitle}</h1>
              {promoDescription && (
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{promoDescription}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatDateLocalized(promo.startDate, t)} — {formatDateLocalized(promo.endDate, t)}</span>
                {isLive && daysLeft <= 14 && (
                  <span className="flex items-center gap-1 font-medium text-amber-600"><Clock className="h-3.5 w-3.5" />{t('sx.promo.remaining')} {daysLeft} {t('sx.promo.daysWord')}</span>
                )}
              </div>
            </div>
            {isLive && <Countdown endDate={promo.endDate} />}
          </div>
          {isLive && <div className="mt-4"><ProgressBar start={promo.startDate} end={promo.endDate} /></div>}
        </div>
      </div>

      {/* Products */}
      {promoProducts.length > 0 && (
        <div className="mt-12">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-xl font-bold">{t('sx.promo.products')}</h2>
            </div>
            <Badge variant="secondary" className="text-xs">{promoProducts.length} {t('sx.itemsWord')}</Badge>
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {promoProducts.map((p, i) => (
              <ProductCard key={p._id} id={p._id} slug={p.slug} atgCode={p.atgCode} sku={p.sku} name={p.name} nameRu={p.nameRu} nameEn={p.nameEn} price={p.price} wholesalePrice={p.wholesalePrice} compareAtPrice={p.compareAtPrice} retailDiscount={p.retailDiscount} wholesaleDiscount={p.wholesaleDiscount} image={p.images?.[0]} inStock={p.stock > 0} stock={p.stock} rating={p.rating} reviewCount={p.reviewCount} carBrand={p.attributes?.carBrand} attributes={p.attributes} index={i} />
            ))}
          </div>
        </div>
      )}

      {promoProducts.length === 0 && (
        <div className="mt-12 text-center py-12 text-muted-foreground">{t('sx.promo.noProducts')}</div>
      )}
    </div>
  );
}
