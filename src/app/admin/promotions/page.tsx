'use client';

import { formatDateHy, formatPrice } from '@/lib/formatters';

import { useQuery, useMutation } from 'convex/react';
import { useRouter } from 'next/navigation';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, Tag, Percent, Calendar, Clock, Package } from 'lucide-react';
import { toast } from 'sonner';
import { Id } from '../../../../convex/_generated/dataModel';
import { useReveal, revealStyle } from '@/lib/motion';
import { useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import Image from 'next/image';

export default function AdminPromotionsPage() {
  const promotions = useQuery(api.promotions.list, {});
  const router = useRouter();
  const remove = useMutation(api.promotions.remove);
  const sessionToken = useAuthStore((s) => s.sessionToken);

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold">Ակցիաներ</h1>
          <p className="text-muted-foreground">{promotions?.length ?? 0} ակցիա</p>
        </div>
        <Link href="/admin/promotions/add"><Button className="gap-2"><Plus className="h-4 w-4" /> Ավելացնել</Button></Link>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {promotions?.map((promo, i) => <PromoCard key={promo._id} promo={promo} index={i} onEdit={() => router.push(`/admin/promotions/${promo._id}/edit`)} onDelete={async () => { await remove({ sessionToken: sessionToken!, id: promo._id }); toast.success('Ակցիան հաջողությամբ հեռացվեց'); }} />)}
      </div>

      {promotions?.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Tag className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground">Ակցիաներ չեն գտնվել</p>
        </div>
      )}
    </div>
  );
}

function PromoCard({ promo, index, onDelete, onEdit }: { promo: { _id: Id<'promotions'>; title: string; description?: string; imageUrl?: string; discountPercent?: number; discountAmount?: number; productIds?: Id<'products'>[]; categoryIds?: Id<'categories'>[]; startDate: number; endDate: number; isActive: boolean }; index: number; onDelete: () => void; onEdit: () => void }) {
  const { ref, visible } = useReveal();
  const [now] = useState(() => Date.now());
  const isExpired = promo.endDate < now;
  const isUpcoming = promo.startDate > now;
  const isLive = !isExpired && !isUpcoming;
  const itemsCount = (promo.productIds?.length ?? 0) + (promo.categoryIds?.length ?? 0);
  const daysLeft = Math.ceil((promo.endDate - now) / 86400000);

  return (
    <div ref={ref} style={revealStyle(visible, index * 0.06)}>
      <div className="group relative overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-muted">
          {promo.imageUrl ? (
            <Image src={promo.imageUrl} alt={promo.title} fill sizes="320px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Percent className="h-16 w-16 text-primary/20" strokeWidth={1} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />

          {/* Discount badge */}
          {promo.discountPercent && (
            <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-xl bg-destructive px-3 py-1.5 text-sm font-black text-white shadow-lg">
              <Percent className="h-4 w-4" /> -{promo.discountPercent}%
            </div>
          )}

          {/* Status badge */}
          <div className="absolute right-4 top-4">
            <Badge className={`border-0 text-[10px] px-2 py-1 shadow-md ${isLive ? 'bg-green-500 text-white' : isUpcoming ? 'bg-blue-500 text-white' : 'bg-muted-foreground/60 text-white'}`}>
              {isLive ? 'Ակտիվ' : isUpcoming ? 'Շուտով' : 'Ավարտված'}
            </Badge>
          </div>

          {/* Days left */}
          {isLive && daysLeft <= 7 && (
            <div className="absolute right-4 bottom-4 flex items-center gap-1 rounded-lg bg-background/90 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur-sm">
              <Clock className="h-3 w-3" /> {daysLeft} օր
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
              <span>{formatDateHy(promo.startDate)} — {formatDateHy(promo.endDate)}</span>
            </div>
            {itemsCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Package className="h-3.5 w-3.5" />
                <span>{itemsCount}</span>
              </div>
            )}
          </div>

          {/* Actions on hover */}
          <div className="mt-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs" onClick={onEdit}>
              <Edit className="h-3 w-3" /> Խմբագրել
            </Button>
            <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-3 w-3" /> Ջնջել
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
