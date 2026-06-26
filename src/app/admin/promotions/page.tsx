'use client';

import { formatDateLocalized, formatPrice } from '@/lib/formatters';

import { useQuery, useMutation } from 'convex/react';
import { useRouter } from 'next/navigation';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Edit, Tag, Percent, Calendar, Clock, Package, Search, ShoppingBag, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Id } from '../../../../convex/_generated/dataModel';
import { useReveal, revealStyle } from '@/lib/motion';
import { useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import Image from 'next/image';
import { PromoTemplate, parsePromoConfig } from '@/components/PromoTemplate';
import { useAdminT } from '@/lib/i18n/admin';

export default function AdminPromotionsPage() {
  const promotions = useQuery(api.promotions.list, {});
  const router = useRouter();
  const remove = useMutation(api.promotions.remove);
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const { t } = useAdminT();

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold">{t('acat.promotions')}</h1>
          <p className="text-muted-foreground">{promotions?.length ?? 0} {t('acat.promotionCountWord')}</p>
        </div>
        <Link href="/admin/promotions/add"><Button className="gap-2"><Plus className="h-4 w-4" /> {t('acat.add')}</Button></Link>
      </div>

      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {promotions?.map((promo, i) => <PromoCard key={promo._id} promo={promo} index={i} onEdit={() => router.push(`/admin/promotions/${promo._id}/edit`)} onDelete={async () => { await remove({ sessionToken: sessionToken!, id: promo._id }); toast.success(t('acat.promoDeleted')); }} />)}
      </div>

      {promotions?.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Tag className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground">{t('acat.noPromotions')}</p>
        </div>
      )}

      {/* Promoted products (on-sale items) */}
      <PromotedProductsSection />
    </div>
  );
}

function PromotedProductsSection() {
  const promoProducts = useQuery(api.promotions.getPromoProducts, {});
  const allProducts = useQuery(api.products.list, { limit: 200 });
  const updateProduct = useMutation(api.products.update);
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const { t } = useAdminT();
  const [search, setSearch] = useState('');

  const togglePromotion = async (productId: Id<'products'>, current: boolean) => {
    try {
      await updateProduct({ sessionToken: sessionToken!, id: productId, showInPromotions: !current });
      toast.success(current ? t('acat.removedFromPromos') : t('acat.addedToPromos'));
    } catch { toast.error(t('acat.updateFailed')); }
  };

  const filteredAll = allProducts?.filter(
    (p) => p.isActive && p.name.toLowerCase().includes(search.toLowerCase()),
  ).slice(0, 20) ?? [];

  return (
    <div className="mt-12">
      <div className="mb-6 flex items-center gap-3">
        <ShoppingBag className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">{t('acat.discountedProducts')}</h2>
        <Badge variant="secondary" className="ml-auto text-xs">
          {promoProducts?.length ?? 0} {t('acat.productWord')}
        </Badge>
      </div>

      {/* Already promoted products */}
      <div className="mb-4 space-y-1.5">
        {promoProducts?.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('acat.noPromoProducts')}</p>
        )}
        {promoProducts?.map((p) => {
          const discount = p.compareAtPrice && p.compareAtPrice > p.price
            ? Math.round((1 - p.price / p.compareAtPrice) * 100)
            : 0;
          return (
            <div key={p._id} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2.5">
              <button
                onClick={() => togglePromotion(p._id, true)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-primary bg-primary text-primary-foreground"
              >
                <Package className="h-3 w-3" />
              </button>
              <span className="flex-1 truncate text-sm font-medium">{p.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground line-through">{p.compareAtPrice?.toLocaleString('hy-AM')} ֏</span>
              <span className="shrink-0 text-sm font-bold text-destructive">{p.price.toLocaleString('hy-AM')} ֏</span>
              {discount > 0 && (
                <Badge className="shrink-0 text-[10px]">-{discount}%</Badge>
              )}
            </div>
          );
        })}
      </div>

      {/* Search & add */}
      <div className="py-4">
        <Label className="text-xs text-muted-foreground">{t('acat.addProduct')}</Label>
        <div className="relative mt-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('acat.searchProducts')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9"
          />
        </div>
        {search && (
          <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border">
            {filteredAll.map((p) => {
              const alreadyPromoted = promoProducts?.some((pp) => pp._id === p._id);
              return (
                <button
                  key={p._id}
                  onClick={() => {
                    if (!alreadyPromoted) togglePromotion(p._id, false);
                  }}
                  disabled={alreadyPromoted}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${alreadyPromoted ? 'opacity-40' : ''}`}
                >
                  <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${alreadyPromoted ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'}`}>
                    {alreadyPromoted && <Package className="h-2.5 w-2.5" />}
                  </div>
                  <span className="truncate">{p.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{p.price.toLocaleString('hy-AM')} ֏</span>
                </button>
              );
            })}
            {filteredAll.length === 0 && <p className="p-3 text-sm text-muted-foreground">{t('acat.noProductsFound')}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function PromoCard({ promo, index, onDelete, onEdit }: { promo: { _id: Id<'promotions'>; title: string; description?: string; imageUrl?: string; images?: string[]; templateJson?: string; discountPercent?: number; discountAmount?: number; productIds?: Id<'products'>[]; categoryIds?: Id<'categories'>[]; startDate: number; endDate: number; isActive: boolean }; index: number; onDelete: () => void; onEdit: () => void }) {
  const { ref, visible } = useReveal();
  const tpl = parsePromoConfig(promo.templateJson);
  const { t } = useAdminT();
  const [now] = useState(() => Date.now());
  const isExpired = promo.endDate < now;
  const isUpcoming = promo.startDate > now;
  const isLive = promo.isActive && !isExpired && !isUpcoming;
  const itemsCount = (promo.productIds?.length ?? 0) + (promo.categoryIds?.length ?? 0);
  const daysLeft = Math.ceil((promo.endDate - now) / 86400000);

  return (
    <div ref={ref} style={revealStyle(visible, index * 0.06)}>
      <div className="group relative overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        {/* Image */}
        <div className={`relative ${tpl ? 'aspect-square' : 'aspect-[4/3]'} overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-muted`}>
          {tpl ? (
            <PromoTemplate config={tpl} className="absolute inset-0 h-full w-full" />
          ) : promo.imageUrl ? (
            <Image src={promo.imageUrl} alt={promo.title} fill sizes="320px" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Percent className="h-16 w-16 text-primary/20" strokeWidth={1} />
            </div>
          )}
          {!tpl && <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/20 to-transparent" />}

          {/* Discount badge */}
          {promo.discountPercent && (
            <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-xl bg-destructive px-3 py-1.5 text-sm font-black text-white shadow-lg">
              <Percent className="h-4 w-4" /> -{promo.discountPercent}%
            </div>
          )}

          {/* Status badge */}
          <div className="absolute right-4 top-4">
            <Badge className={`border-0 text-[10px] px-2 py-1 shadow-md ${isLive ? 'bg-green-500 text-white' : isUpcoming ? 'bg-blue-500 text-white' : 'bg-muted-foreground/60 text-white'}`}>
              {isLive ? t('acat.active') : isUpcoming ? t('acat.soon') : t('acat.ended')}
            </Badge>
          </div>

          {/* Days left */}
          {isLive && daysLeft <= 7 && (
            <div className="absolute right-4 bottom-4 flex items-center gap-1 rounded-lg bg-background/90 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur-sm">
              <Clock className="h-3 w-3" /> {daysLeft} {t('acat.daysWord')}
            </div>
          )}

          {/* Multi-image indicator */}
          {((promo.images?.length ?? 1) > 1) && (
            <div className="absolute left-4 bottom-4 flex items-center gap-1 rounded-lg bg-background/90 px-2 py-1 text-[10px] font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
              <ImageIcon className="h-3 w-3" />
              {promo.images!.length}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-bold leading-tight group-hover:text-primary transition-colors">{promo.title}</h3>
            {promo.discountAmount && (
              <span className="shrink-0 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">-{formatPrice(promo.discountAmount)}</span>
            )}
          </div>

          {promo.description && (
            <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{promo.description}</p>
          )}

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDateLocalized(promo.startDate, t)} — {formatDateLocalized(promo.endDate, t)}</span>
            </div>
            {itemsCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Package className="h-3.5 w-3.5" />
                <span>{itemsCount}</span>
              </div>
            )}
          </div>

          {/* Actions on hover */}
          <div className="mt-4 flex gap-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
            <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs" onClick={onEdit}>
              <Edit className="h-3 w-3" /> {t('acat.edit')}
            </Button>
            <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-3 w-3" /> {t('acat.delete')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
