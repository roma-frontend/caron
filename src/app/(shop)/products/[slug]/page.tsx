'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { ProductCard } from '@/components/cards/ProductCard';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Heart, ArrowLeft, Check, Truck, Shield, Star, Share2, Smartphone, Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { formatPrice, discountPercent } from '@/lib/formatters';
import { useCartStore } from '@/store/cart';
import { useFavoritesStore } from '@/store/favorites';
import { useVehicleStore } from '@/store/vehicle';
import { useSettings } from '@/hooks/useSettings';
import { Loader } from '@/components/ui/loader';
import { useRecentlyViewedStore } from '@/store/recentlyViewed';
import { useAuthStore } from '@/store/auth';
import { RecentlyViewed } from '@/components/RecentlyViewed';
import { ProductReviews } from '@/components/ProductReviews';
import dynamic from 'next/dynamic';
import { PRODUCT } from '@/lib/constants';
import Link from 'next/link';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ProductImageZoom } from '@/components/ProductImageZoom';
import { flyProductAway, flyProductToTarget } from '@/lib/flyToTarget';
import { showUndoCountdownToast } from '@/lib/undoCountdownToast';
const StickyBuyBar = dynamic(() => import('@/components/StickyBuyBar').then((m) => ({ default: m.StickyBuyBar })));
const QuickBuyButton = dynamic(() => import('@/components/QuickBuy').then((m) => ({ default: m.QuickBuyButton })));
import { useCompareStore } from '@/store/compare';
import { GitCompareArrows } from 'lucide-react';
import Image from 'next/image';
import Script from 'next/script';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableVariantThumb({
  id,
  active,
  name,
  image,
  onClick,
  onHover,
  onLeave,
}: {
  id: Id<'products'>;
  active: boolean;
  name: string;
  image?: string;
  onClick: () => void;
  onHover: () => void;
  onLeave: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`shrink-0 rounded-xl border-2 p-1 transition-all touch-none ${active ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}
      {...attributes}
      {...listeners}
    >
      {image ? (
        <Image src={image} alt={name} className="h-20 w-16 rounded-lg object-cover" width={48} height={48} />
      ) : (
        <div className="flex h-20 w-16 items-center justify-center rounded-lg bg-muted text-[8px] text-muted-foreground leading-tight text-center p-0.5">{name.slice(-12)}</div>
      )}
    </button>
  );
}

function normalizeAttrText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export default function ProductDetailPage() {
  const { slug } = useParams();
  const _baseProduct = useQuery(api.products.getBySlug, { slug: slug as string });
  const variants = useQuery(api.products.getVariantGroup, _baseProduct && (_baseProduct as Record<string, unknown>).variantGroup ? { variantGroup: (_baseProduct as Record<string, unknown>).variantGroup as string } : 'skip');
  const reorderVariantGroup = useMutation(api.products.reorderVariantGroup);
  const [overrideProduct, setOverrideProduct] = useState<typeof _baseProduct | null>(null);
  const [hoveredVariant, setHoveredVariant] = useState<NonNullable<typeof variants>[number] | null>(null);
  const [orderedVariantIds, setOrderedVariantIds] = useState<string[]>([]);
  const product = overrideProduct ?? _baseProduct;
  const stats = useQuery(api.reviews.getStats, product?._id ? { productId: product._id } : 'skip');
  const vehicle = useVehicleStore((s) => s.vehicle);
  const settings = useSettings();
  const addViewed = useRecentlyViewedStore((s) => s.add);
  const productId = product?._id;
  const filterDefs = useQuery(api.filters.getByCategory, product?.categoryId ? { categoryId: product.categoryId } : 'skip');
  const attrNames: Record<string, string> = {};
  if (filterDefs) {
    for (const f of filterDefs) {
      attrNames[f._id] = f.name;
      attrNames[f.slug] = f.name;
    }
  }
  const resolveAttrLabel = (key: string, val: unknown) => {
    if (attrNames[key]) return attrNames[key];
    if (filterDefs) {
      const values = Array.isArray(val) ? val : [val];
      const normalizedValues = values
        .filter((v): v is string => typeof v === 'string')
        .map(normalizeAttrText)
        .filter(Boolean);

      if (normalizedValues.length > 0) {
        const matchedDef = filterDefs.find((def) =>
          (def.options ?? []).some((opt) => {
            const nOpt = normalizeAttrText(opt);
            return normalizedValues.some((v) => v === nOpt || v.includes(nOpt) || nOpt.includes(v));
          }),
        );
        if (matchedDef) return matchedDef.name;
      }
    }

    // Hide technical Convex-like ids from storefront users.
    if (/^j[0-9a-z]{12,}$/i.test(key)) return 'Ատրիբուտ';
    return key;
  };
  const currentUser = useAuthStore((s) => s.user);
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const items = useCartStore((s) => s.items);
  const [qty, setQty] = useState(1);
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const step = product?.qtyStep || 1;
  const isWholesale = currentUser?.customerType === 'wholesale' && currentUser?.role !== 'admin';
  const userDiscount = currentUser?.role !== 'admin' ? (currentUser?.discountPercent ?? 0) : 0;
  // If product explicitly sets wholesaleDiscount, it overrides customer's personal discount
  const effectiveDiscount = isWholesale
    ? (product?.wholesaleDiscount != null && product.wholesaleDiscount > 0
        ? product.wholesaleDiscount
        : (product?.wholesaleDiscount == null ? userDiscount : 0))
    : 0;
  const baseWholesale = isWholesale
    ? (typeof product?.wholesalePrice === 'number' && product.wholesalePrice > 0
        ? product.wholesalePrice
        : Math.round((product?.price ?? 0) * (1 - effectiveDiscount / 100)))
    : (product?.price ?? 0);
  const fallbackWholesale = isWholesale ? baseWholesale : (product?.price ?? 0);
  const retailDisplayPrice = !isWholesale && product?.retailDiscount && product.retailDiscount > 0
    ? Math.round((product.price) * (1 - product.retailDiscount / 100))
    : product?.price ?? 0;
  const cartPrice = product ? (isWholesale ? fallbackWholesale : retailDisplayPrice) : 0;
  const cartQty = product ? items.find((i) => i.id === product._id)?.quantity ?? 0 : 0;
  const maxQty = product ? Math.max(0, product.stock - cartQty) : 0;

  useEffect(() => { if (product) addViewed({ id: product._id, slug: product.slug, name: product.name, price: product.price, image: product.images?.[0] ?? null }); }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps
  const { add: addCompare, isInCompare } = useCompareStore();
  const inCompare = isInCompare(product?._id ?? '');
  const toggleFav = useFavoritesStore((s) => s.toggle);
  const favoriteItems = useFavoritesStore((s) => s.items);
  const isFav = useFavoritesStore((s) => s.items.some((i) => i.id === product?._id));
  const imgs = product?.images ?? [];
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [emblaIndex, setEmblaIndex] = useState(0);
  const emblaSnaps = imgs.map((_, i) => i);
  const onEmblaSelect = useCallback(() => {
    if (!emblaApi) return;
    setEmblaIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);
  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onEmblaSelect);
  }, [emblaApi, onEmblaSelect]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  if (product === undefined) return <Loader />;
  if (product === null) return (
    <div className="py-20 text-center">
      <p className="text-lg text-muted-foreground">{'Ապրանքը չի գտնվել'}</p>
      <Link href="/products"><Button variant="outline" className="mt-4 gap-2"><ArrowLeft className="h-4 w-4" /> {'Որոնել ապրանքներ'}</Button></Link>
    </div>
  );

  const attrs = (product.attributes ?? {}) as Record<string, unknown>;
  const compat = attrs.vehicleCompat as Array<{ brand: string; model: string; yearFrom: number; yearTo: number }> | undefined;
  const fitsCompat = vehicle && compat?.some((c) => c.brand === vehicle.brand && c.model === vehicle.model && Number(vehicle.year) >= c.yearFrom && Number(vehicle.year) <= c.yearTo);
  const fitsSimple = vehicle && typeof attrs.carBrand === 'string' && vehicle.brand === attrs.carBrand;

  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images,
    sku: product.sku || undefined,
    mpn: product.oemNumbers?.[0] || undefined,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'AMD',
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
    ...(product.reviewCount ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating, reviewCount: product.reviewCount } } : {}),
  };

  const orderedVariants = variants
    ? (() => {
      if (orderedVariantIds.length === 0) return variants;
      const byId = new Map(variants.map((v) => [String(v._id), v] as const));
      const ordered = orderedVariantIds.map((id) => byId.get(id)).filter(Boolean) as NonNullable<typeof variants>;
      const rest = variants.filter((v) => !orderedVariantIds.includes(String(v._id)));
      if (ordered.length === 0) return variants;
      return [...ordered, ...rest];
    })()
    : variants;

  const handleVariantDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!orderedVariants || !over || active.id === over.id) return;
    if (!product || !sessionToken || currentUser?.role !== 'admin') return;

    const oldIndex = orderedVariants.findIndex((v) => String(v._id) === String(active.id));
    const newIndex = orderedVariants.findIndex((v) => String(v._id) === String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(orderedVariants, oldIndex, newIndex);
    setOrderedVariantIds(next.map((v) => v._id));

    try {
      await reorderVariantGroup({
        sessionToken,
        variantGroup: (product as Record<string, unknown>).variantGroup as string,
        items: next.map((v, i) => ({ id: v._id as Id<'products'>, order: i })),
      });
    } catch {
      toast.error('Չհաջողվեց պահպանել տարբերակների հերթականությունը');
      setOrderedVariantIds(orderedVariants.map((v) => v._id));
    }
  };

  return (
    <div data-product-content className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-8)' }}>
      {settings?.enableBreadcrumbs !== false && (
        <Breadcrumbs items={[{ label: 'Ապրանքներ', href: '/products' }, { label: product.name }]} />
      )}
      <Script id="product-json-ld" type="application/ld+json" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        {/* Gallery — Embla carousel */}
        <div className="lg:max-w-140">
          <div className="relative overflow-hidden rounded-2xl border bg-muted/30 group/carousel">
            <div ref={emblaRef} className="overflow-hidden">
              <div className="flex">
                {imgs.length > 0 ? imgs.map((img, i) => (
                  <div key={i} className="relative min-w-0 shrink-0 grow-0 basis-full aspect-square">
                    <ProductImageZoom src={img} alt={`${product.name} ${i + 1}`} width={800} height={800} priority={i === 0} fit="fill" className="h-full w-full bg-muted/20" sizes="(max-width: 1024px) 100vw, 560px" />
                  </div>
                )) : (
                  <div className="min-w-0 shrink-0 grow-0 basis-full aspect-square flex items-center justify-center text-muted-foreground/20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                  </div>
                )}
              </div>
            </div>
            {imgs.length > 1 && (
              <>
                <button onClick={() => emblaApi?.scrollPrev()} className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 shadow-lg opacity-100 md:opacity-0 md:group-hover/carousel:opacity-100 transition-opacity backdrop-blur-sm hover:bg-background" aria-label="Հետ">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={() => emblaApi?.scrollNext()} className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 shadow-lg opacity-100 md:opacity-0 md:group-hover/carousel:opacity-100 transition-opacity backdrop-blur-sm hover:bg-background" aria-label="Առաջ">
                  <ChevronRight className="h-5 w-5" />
                </button>
                {/* Dots */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {emblaSnaps.map((_, i) => (
                    <button key={i} onClick={() => emblaApi?.scrollTo(i)} className={`h-2 rounded-full transition-all duration-300 ${i === emblaIndex ? 'w-6 bg-primary' : 'w-2 bg-background/70 hover:bg-background'}`} aria-label={`Slide ${i + 1}`} />
                  ))}
                </div>
              </>
            )}
          </div>
          {/* Thumbnails */}
          {imgs.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto overflow-y-hidden px-0.5">
              {imgs.map((img, i) => (
                <button key={i} onClick={() => emblaApi?.scrollTo(i)}
                  className={`h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200 ${i === emblaIndex ? 'border-primary ring-1 ring-primary/30' : 'border-transparent opacity-70 hover:opacity-100 hover:border-muted-foreground/30'}`}>
                  <Image src={img} alt="" width={150} height={150} sizes="64px" className="h-full w-full bg-muted/20 object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{product.name}</h1>

          {orderedVariants && orderedVariants.length > 1 && (
            <div className="mt-3 relative">
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => { const el = document.getElementById('variant-scroll'); if (el) el.scrollBy({ left: -120, behavior: 'smooth' }); }} className="shrink-0 rounded-full border p-1 hover:bg-accent"><ChevronLeft className="h-4 w-4" /></button>
                <div id="variant-scroll" className="overflow-x-auto scrollbar-none py-1">
                  {currentUser?.role === 'admin' ? (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleVariantDragEnd}>
                      <SortableContext items={orderedVariants.map((v) => v._id)} strategy={horizontalListSortingStrategy}>
                        <div className="flex items-center gap-1.5">
                          {orderedVariants.map((v) => (
                            <SortableVariantThumb
                              key={v._id}
                              id={v._id}
                              active={v._id === product?._id}
                              name={v.name}
                              image={v.images?.[0]}
                              onClick={() => setOverrideProduct(v)}
                              onHover={() => setHoveredVariant(v)}
                              onLeave={() => setHoveredVariant(null)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      {orderedVariants.map((v) => (
                        <button type="button" key={v._id} onClick={() => setOverrideProduct(v)} onMouseEnter={() => setHoveredVariant(v)} onMouseLeave={() => setHoveredVariant(null)} className={`shrink-0 rounded-xl border-2 p-1 transition-all ${v._id === product?._id ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}>
                          {v.images?.[0] ? (
                            <Image src={v.images[0]} alt={v.name} className="h-20 w-16 rounded-lg object-cover" width={48} height={48} />
                          ) : (
                            <div className="flex h-20 w-16 items-center justify-center rounded-lg bg-muted text-[8px] text-muted-foreground leading-tight text-center p-0.5">{v.name.slice(-12)}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => { const el = document.getElementById('variant-scroll'); if (el) el.scrollBy({ left: 120, behavior: 'smooth' }); }} className="shrink-0 rounded-full border p-1 hover:bg-accent"><ChevronRight className="h-4 w-4" /></button>
              </div>
              {hoveredVariant?.images?.[0] && (
                <div className="hidden sm:block absolute top-full left-1/2 z-50 mt-2 -translate-x-1/2 rounded-xl border bg-popover p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                  <Image src={hoveredVariant.images[0]} alt={hoveredVariant.name} width={176} height={200} className="h-50 w-44 rounded-lg object-fill" />
                  <p className="mt-1 text-center text-[10px] text-muted-foreground truncate max-w-44">{hoveredVariant.name}</p>
                </div>
              )}
            </div>
          )}

          {stats && stats.count > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`h-4 w-4 ${i <= Math.round(stats.avg) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />)}
              </div>
              <span className="text-sm text-muted-foreground">{stats.avg} ({stats.count})</span>
            </div>
          )}

          {(product.sku || product.atgCode || (product.oemNumbers && product.oemNumbers.length > 0)) && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {product.sku && (
                <div className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/50 px-2.5 py-1">
                  <span className="text-[10px] font-mono font-bold tracking-wider text-primary">Արտիկուլ։ {product.sku}</span>
                </div>
              )}
              {product.atgCode && (
                <div className="inline-flex items-center gap-1.5 rounded-lg border bg-primary/5 px-2.5 py-1">
                  <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground">ԱՏԳԱԱ {product.atgCode}</span>
                </div>
              )}
              {product.oemNumbers?.map((oem) => {
                const code = typeof oem === 'string' ? oem : oem.code;
                const mfr = typeof oem === 'string' ? null : oem.manufacturer;
                return (
                  <Link key={code} href={`/oem/${encodeURIComponent(code)}`} className="inline-flex items-center gap-1.5 rounded-lg border bg-blue-500/5 px-2.5 py-1 transition-colors hover:bg-blue-500/10 hover:border-blue-500/30">
                    {mfr && mfr !== 'Unknown' && <span className="text-[10px] font-mono text-muted-foreground">{mfr}</span>}
                    <span className="text-[10px] font-mono font-bold tracking-wider text-blue-600 dark:text-blue-400">OEM {code}</span>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <span className="text-2xl sm:text-3xl font-bold text-primary">{formatPrice(cartPrice)}</span>
            {product.compareAtPrice ? (
              <>
                <span className="text-lg text-muted-foreground line-through">{formatPrice(product.compareAtPrice)}</span>
                <Badge className="bg-destructive text-white">-{discountPercent(product.price, product.compareAtPrice)}%</Badge>
              </>
            ) : cartPrice !== product.price ? (
              <>
                <span className="text-sm text-muted-foreground line-through">{formatPrice(product.price)}</span>
                {product.retailDiscount && product.retailDiscount > 0 && !isWholesale && <Badge className="bg-destructive text-white">-{product.retailDiscount}%</Badge>}
              </>
            ) : null}
          </div>

          <div className="mt-3">
            {product.stock > 0 && product.stock <= 10 ? (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-orange-600"><Check className="h-4 w-4" /> Միայն {product.stock} հատ պահեստում</span>
            ) : product.stock > 0 ? (
              <span className="inline-flex items-center gap-1 text-sm text-green-600"><Check className="h-4 w-4" /> {'Առկա է'}</span>
            ) : (
              <span className="text-sm text-destructive">{PRODUCT.outOfStock}</span>
            )}
          </div>

          {product.stock <= 0 && settings !== undefined && settings?.enableBackInStock !== false && (
            <div className="mt-3">
              <BackInStockButton productId={product._id} />
            </div>
          )}

          {(fitsCompat || (typeof attrs.carBrand === 'string' && attrs.carBrand)) && (
            <div className="mt-3">
              {fitsCompat || fitsSimple ? (
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-emerald-400/5 px-3 py-1.5 text-sm font-semibold text-emerald-600 shadow-xs dark:text-emerald-400">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20">
                    <Check className="h-3 w-3" />
                  </div>
                  <span>{vehicle?.brand}{vehicle?.model ? ` ${vehicle.model}` : ''}</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5 px-3 py-1.5 text-sm font-semibold text-primary shadow-xs">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                  {attrs.carBrand as string}
                </div>
              )}
            </div>
          )}

          <Separator className="my-5" />

          <p className="text-muted-foreground leading-relaxed">{product.description}</p>

          {/* Attributes */}
          {Object.entries(attrs).filter(([k]) => k !== 'vehicleCompat' && k !== 'carBrand' && k !== 'brand').length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 font-semibold">{'Ատրիբուտներ'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(attrs).filter(([k]) => k !== 'vehicleCompat' && k !== 'carBrand' && k !== 'brand').map(([key, val]) => (
                  <div key={key} className="flex justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{resolveAttrLabel(key, val)}</span>
                    <span className="font-medium text-right">{typeof val === 'boolean' ? (val ? 'Այո' : 'Ոչ') : Array.isArray(val) ? val.join(', ') : String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator className="my-5" />

          {/* Quantity */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{'Քանակ'}</span>
            <div className="flex items-center rounded-lg border">
              <button onClick={() => setQty(Math.max(step, qty - step))} disabled={qty <= step} className="flex h-10 w-10 items-center justify-center text-lg hover:bg-muted transition-colors rounded-l-lg disabled:opacity-30">−</button>
              <span className="flex h-10 w-12 items-center justify-center font-semibold border-x">{qty}</span>
              <button onClick={() => setQty(Math.min(maxQty, qty + step))} disabled={qty >= maxQty} className="flex h-10 w-10 items-center justify-center text-lg hover:bg-muted transition-colors rounded-r-lg disabled:opacity-30">+</button>
            </div>
          </div>

          <div className="h-3" />

          {/* Actions */}
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Button size="lg" className="w-full sm:flex-1 gap-2 order-first" disabled={product.stock <= 0 || maxQty <= 0}
              onClick={(e) => { const prevQty = cartQty; const s = product.qtyStep || 1; for (let i = 0; i < qty; i++) addItem({ id: product._id, name: product.name, price: cartPrice, image: product.images?.[0] ?? null, maxStock: product.stock, qtyStep: s }); flyProductToTarget({ triggerEl: e.currentTarget as HTMLElement, kind: 'cart', imageSrc: product.images?.[0] ?? null }); showUndoCountdownToast({ message: 'Ապրանքը տեղափոխվեց զամբյուղ', description: `${product.name} · քանակ ${qty}`, undoLabel: 'Վերադարձնել', onUndo: () => { if (prevQty <= 0) removeItem(product._id); else updateQuantity(product._id, prevQty); } }); }}>
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" /> {PRODUCT.addToCart}
            </Button>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button size="icon" variant="outline" title={isFav ? 'Հեռացնել նախընտրածներից' : 'Ավելացնել նախընտրածներին'}
              className={isFav ? 'text-red-500 border-red-200 h-10 w-10 sm:h-11 sm:w-11' : 'h-10 w-10 sm:h-11 sm:w-11 hover:text-red-500 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20'}
              onClick={(e) => { const adding = !isFav; const existing = favoriteItems.find((i) => i.id === product._id); if (!adding) flyProductAway({ triggerEl: e.currentTarget as HTMLElement, imageSrc: product.images?.[0] ?? null }); toggleFav({ id: product._id, name: product.name, price: product.price, image: product.images?.[0] ?? null }); if (adding) { flyProductToTarget({ triggerEl: e.currentTarget as HTMLElement, kind: 'favorites', imageSrc: product.images?.[0] ?? null }); } else if (existing) { showUndoCountdownToast({ message: `${product.name} հեռացվեց ընտրյալներից`, onUndo: () => toggleFav(existing) }); } }}>
              <Heart className={`h-4 w-4 sm:h-5 sm:w-5 ${isFav ? 'fill-current' : ''}`} />
            </Button>
            <Button variant="outline" size="icon" title={inCompare ? 'Համեմատման մեջ' : 'Համեմատել'}
              className={`h-10 w-10 sm:h-11 sm:w-11 ${inCompare ? 'border-primary text-primary' : 'hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/20'}`}
              onClick={() => { if (!inCompare) { addCompare({ id: product._id, slug: product.slug, name: product.name, price: product.price, image: product.images?.[0] ?? null, attributes: (product.attributes ?? {}) as Record<string, string> }); toast.success('Ավելացվեց համեմատման'); } }}>
              <GitCompareArrows className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            {settings?.enableShareButtons !== false && (
              <ShareButton productName={product.name} />
            )}
            {settings !== undefined && settings?.enablePriceAlert !== false && (
              <SubscribePriceButton productId={product._id} currentPrice={product.price} />
            )}
            {settings?.enableQuickBuy !== false && (
              <QuickBuyButton productId={product._id} productName={product.name} productPrice={product.price} productImage={product.images?.[0]} />
            )}
            </div>
          </div>

          {/* Trust */}
          <div className="mt-6 flex flex-wrap gap-3 sm:gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Truck className="h-4 w-4" /> {'Առաքման վճար'}</span>
            <span className="flex items-center gap-1"><Shield className="h-4 w-4" /> {'Անվտանգ գնումներ'}</span>
          </div>
        </div>
      </div>

      {settings !== undefined && settings?.enableReviews !== false && <ProductReviews productId={product._id} />}

      <RecentlyViewed />

      {/* Related Products */}
      <div className="mt-12">
        <h2 className="mb-6 text-xl font-bold">{'Նմանատիպ ապրանքներ'}</h2>
        <RelatedProducts categoryId={product.categoryId} currentId={product._id} />
      </div>

      <StickyBuyBar productId={product._id} productName={product.name} productPrice={cartPrice} productImage={product.images?.[0]} productCompareAtPrice={product.compareAtPrice} inStock={product.stock > 0} slug={product.slug} qty={qty} productStock={product.stock} />
    </div>
  );
}

function BackInStockButton({ productId }: { productId: string }) {
  const [contact, setContact] = useState('');
  const subscribe = useMutation(api.backInStock.subscribe);
  const [sent, setSent] = useState(false);
  const handleSubmit = async () => {
    if (!contact) return;
    await subscribe({ productId: productId as Id<'products'>, contact });
    setSent(true);
    toast.success('Կծանուցենք Telegram-ով երբ ապրանքը հայտնվի');
  };
  if (sent) return <p className="text-sm text-green-600">✅ Կծանուցենք Telegram-ով</p>;
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="@username կամ հեռախոս" className="h-10 flex-1" />
      <Button size="sm" onClick={handleSubmit} disabled={!contact} className="gap-2 shrink-0 w-full sm:w-auto"><Smartphone className="h-4 w-4" /> Telegram</Button>
    </div>
  );
}

function SubscribePriceButton({ productId, currentPrice }: { productId: string; currentPrice: number }) {
  const subscribe = useMutation(api.priceAlerts.subscribe);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (sent) {
    return (
      <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg border border-green-200 bg-green-50 text-green-600" title="Դուք հետևում եք գնին">
        <Bell className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" size="icon" title="Հետևել գնին" aria-label="Հետևել գնին" className="h-10 w-10 sm:h-11 sm:w-11 hover:text-amber-500 hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20" onClick={() => setOpen(true)}>
        <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full sm:bottom-auto sm:top-full right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 mb-2 sm:mt-2 z-50 min-w-[240px] rounded-2xl border bg-popover p-3 shadow-xl animate-in zoom-in-95 duration-150 origin-bottom-right sm:origin-top">
            <p className="text-sm font-semibold mb-1">Հետևել գնին</p>
            <p className="text-xs text-muted-foreground mb-3">Կծանուցենք երբ գինը նվազի</p>
            <div className="flex gap-2">
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ձեր էլ. հասցեն" className="h-9 text-xs flex-1" />
              <Button size="sm" className="h-9 gap-1 text-xs" disabled={!email} onClick={async () => {
                await subscribe({ productId: productId as Id<'products'>, email, priceAtSubscribe: currentPrice });
                setSent(true); setOpen(false); toast.success('Կծանուցենք երբ գինը նվազի');
              }}><Bell className="h-3 w-3" /> OK</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ShareButton({ productName }: { productName: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const share = () => {
    if (navigator.share) {
      navigator.share({ title: productName, url: window.location.href }).catch(() => {});
    } else {
      setOpen(true);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" size="icon" title="Կիսվել" className="h-10 w-10 sm:h-11 sm:w-11 hover:text-sky-500 hover:border-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/20" onClick={share}>
        <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full sm:bottom-auto sm:top-full right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 mb-2 sm:mt-2 z-50 min-w-[200px] rounded-2xl border bg-popover p-2 shadow-xl animate-in zoom-in-95 duration-150 origin-bottom-right sm:origin-top">
            <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Կիսվել</p>
            <Link href={`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(productName)}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-accent"
              onClick={() => setOpen(false)}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M21.5 2.5L2.5 10.5L8.5 13.5L11.5 20.5L15.5 14.5L21.5 2.5Z"/><path d="M11.5 20.5L15.5 14.5L8.5 13.5"/></svg></div>
              Telegram
            </Link>
            <Link href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-accent"
              onClick={() => setOpen(false)}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></div>
              Facebook
            </Link>
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Հղումը պատճենվեց'); setOpen(false); }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-accent">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></div>
              Պատճենել հղումը
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function RelatedProducts({ categoryId, currentId }: { categoryId: string; currentId: string }) {
  const products = useQuery(api.products.list, { categoryId: categoryId as Id<'categories'>, limit: 4 });
  const filtered = products?.filter((p) => p._id !== currentId).slice(0, 4);
  if (!filtered || filtered.length === 0) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {filtered.map((p, i) => (
        <ProductCard key={p._id} id={p._id} slug={p.slug} atgCode={p.atgCode} sku={p.sku} name={p.name} price={p.price} wholesalePrice={p.wholesalePrice} compareAtPrice={p.compareAtPrice} retailDiscount={p.retailDiscount} wholesaleDiscount={p.wholesaleDiscount} image={p.images?.[0]} inStock={p.stock > 0} stock={p.stock} qtyStep={p.qtyStep} rating={p.rating} reviewCount={p.reviewCount} carBrand={p.attributes?.carBrand} attributes={p.attributes} index={i} />
      ))}
    </div>
  );
}
