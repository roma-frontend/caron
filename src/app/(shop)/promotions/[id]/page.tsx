'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/ui/loader';
import { ProductCard } from '@/components/cards/ProductCard';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Clock, Percent, Calendar, ArrowLeft } from 'lucide-react';
import { formatDateHy } from '@/lib/formatters';
import { Id } from '../../../../../convex/_generated/dataModel';
import Image from 'next/image';
import Link from 'next/link';

export default function PromotionDetailPage() {
  const { id } = useParams();
  const promotions = useQuery(api.promotions.active, {});
  const products = useQuery(api.products.list, { limit: 50 });
  const promo = promotions?.find((p) => p._id === id);
  const [now] = useState(() => Date.now());

  if (promotions === undefined) return <Loader />;
  if (!promo) return <div className="py-20 text-center text-muted-foreground">{'Ակցիան չի գտնվել'}</div>;

  const daysLeft = Math.max(0, Math.ceil((promo.endDate - now) / 86400000));
  const isExpired = promo.endDate < now;
  const isUpcoming = promo.startDate > now;

  const promoProducts = products?.filter((p) => {
    if (promo.productIds && promo.productIds.length > 0) return promo.productIds.includes(p._id as Id<'products'>);
    if (promo.categoryIds && promo.categoryIds.length > 0) return promo.categoryIds.includes(p.categoryId as Id<'categories'>);
    return p.compareAtPrice && p.compareAtPrice > p.price;
  }) ?? [];

  return (
    <div className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-8)' }}>
      <Breadcrumbs items={[{ label: 'Ակցիաներ', href: '/promotions' }, { label: promo.title }]} />

      {/* Hero banner with overlay */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="aspect-video sm:aspect-[2.5/1] relative">
          {promo.imageUrl ? (
            <Image src={promo.imageUrl} alt={promo.title} fill priority sizes="100vw" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Percent className="h-24 w-24 text-primary/15" strokeWidth={1} />
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-transparent" />

          {/* Overlaid content */}
          <div className="absolute inset-0 flex flex-col justify-center p-6 sm:p-10 max-w-2xl">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              {promo.discountPercent && (
                <span className="rounded-xl bg-destructive px-3 py-1.5 text-base font-black text-white shadow-lg">
                  -{promo.discountPercent}%
                </span>
              )}
              <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${isExpired ? 'bg-muted-foreground/20 text-muted-foreground' : isUpcoming ? 'bg-blue-500/20 text-blue-600' : 'bg-green-500/20 text-green-600'}`}>
                {isExpired ? 'Ավարտված' : isUpcoming ? 'Շուտով' : 'Ակտիվ'}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground">{promo.title}</h1>
            {promo.description && <p className="mt-3 text-base sm:text-lg text-muted-foreground max-w-xl">{promo.description}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{formatDateHy(promo.startDate)} — {formatDateHy(promo.endDate)}</span>
              {!isExpired && !isUpcoming && daysLeft <= 14 && (
                <span className="flex items-center gap-1.5 text-amber-600 font-medium"><Clock className="h-4 w-4" />Մնաց {daysLeft} օր</span>
              )}
            </div>
          </div>
        </div>

        {/* Back link */}
        <Link href="/promotions" className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm shadow-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>

      {/* Products */}
      {promoProducts.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">{'Ակցիայի ապրանքներ'}</h2>
            <span className="text-sm text-muted-foreground">{promoProducts.length} ապրանք</span>
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {promoProducts.map((p, i) => (
              <ProductCard key={p._id} id={p._id} slug={p.slug} name={p.name} price={p.price} compareAtPrice={p.compareAtPrice} image={p.images?.[0]} inStock={p.stock > 0} stock={p.stock} rating={p.rating} reviewCount={p.reviewCount} carBrand={p.attributes?.carBrand} index={i} />
            ))}
          </div>
        </div>
      )}

      {promoProducts.length === 0 && (
        <div className="mt-10 text-center py-10 text-muted-foreground">Այս ակցիային ապրանքներ չկան</div>
      )}
    </div>
  );
}
