'use client';

import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/ui/loader';
import { ProductCard } from '@/components/cards/ProductCard';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Clock } from 'lucide-react';
import { formatDateHy } from '@/lib/formatters';
import { Id } from '../../../../../convex/_generated/dataModel';
import Image from 'next/image';

export default function PromotionDetailPage() {
  const { id } = useParams();
  const promotions = useQuery(api.promotions.active, {});
  const products = useQuery(api.products.list, { limit: 50 });
  const promo = promotions?.find((p) => p._id === id);

  if (promotions === undefined) return <Loader />;
  if (!promo) return <div className="py-20 text-center text-muted-foreground">{'Ակցիան չի գտնվել'}</div>;

  const promoProducts = products?.filter((p) => {
    if (promo.productIds && promo.productIds.length > 0) return promo.productIds.includes(p._id as Id<'products'>);
    if (promo.categoryIds && promo.categoryIds.length > 0) return promo.categoryIds.includes(p.categoryId as Id<'categories'>);
    return p.compareAtPrice && p.compareAtPrice > p.price;
  }) ?? [];

  return (
    <div className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-8)' }}>
      <Breadcrumbs items={[{ label: 'Ակցիաներ', href: '/promotions' }, { label: promo.title }]} />

      {/* Hero */}
      <div className="overflow-hidden rounded-2xl border">
        {promo.imageUrl ? (
          <Image src={promo.imageUrl} alt={promo.title} width={1200} height={400} priority sizes="100vw" className="w-full aspect-[3/1] object-cover" />
        ) : (
          <div className="w-full aspect-[3/1] bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-foreground/20"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold">{promo.title}</h1>
        {promo.discountPercent && <Badge className="bg-destructive text-lg px-3 py-1 font-black">-{promo.discountPercent}%</Badge>}
      </div>
      {promo.description && <p className="mt-3 text-muted-foreground text-lg">{promo.description}</p>}
      <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>{formatDateHy(promo.startDate)} — {formatDateHy(promo.endDate)}</span>
      </div>

      {/* Products */}
      {promoProducts.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-6 text-xl font-bold">{'Ակցիայի ապրանքներ'}</h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {promoProducts.map((p, i) => (
              <ProductCard key={p._id} id={p._id} slug={p.slug} name={p.name} price={p.price} compareAtPrice={p.compareAtPrice} image={p.images?.[0]} inStock={p.stock > 0} stock={p.stock} rating={p.rating} reviewCount={p.reviewCount} carBrand={p.attributes?.carBrand} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
