'use client';

import { formatDateHy } from '@/lib/formatters';

import { useQuery, useMutation } from 'convex/react';
import { useRouter } from 'next/navigation';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, Tag, Percent, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Id } from '../../../../convex/_generated/dataModel';
import { useReveal, revealStyle } from '@/lib/motion';
import { useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';

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

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
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

function PromoCard({ promo, index, onDelete, onEdit }: { promo: { _id: Id<'promotions'>; title: string; discountPercent?: number; discountAmount?: number; startDate: number; endDate: number; isActive: boolean }; index: number; onDelete: () => void; onEdit: () => void }) {
  const { ref, visible } = useReveal();
  const [now] = useState(() => Date.now());
  const isExpired = promo.endDate < now;
  const isUpcoming = promo.startDate > now;
  const isLive = !isExpired && !isUpcoming;

  return (
    <div ref={ref} style={revealStyle(visible, index * 0.06)}>
      <div className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 to-background transition-all hover:shadow-lg" style={{ boxShadow: 'var(--shadow-xs)' }}>
        <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
          <Button size="icon-sm" variant="secondary" className="h-7 w-7 shadow-md" onClick={onEdit}><Edit className="h-3 w-3" /></Button><Button size="icon-sm" variant="destructive" className="h-7 w-7 shadow-md" onClick={onDelete}><Trash2 className="h-3 w-3" /></Button>
        </div>
        <div className="p-5">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Percent className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold">{promo.title}</h3>
          {promo.discountPercent && <p className="mt-1 text-2xl font-bold text-primary">-{promo.discountPercent}%</p>}
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDateHy(promo.startDate)} — {formatDateHy(promo.endDate)}
          </div>
          <Badge className={`mt-3 text-[10px] border-0 ${isLive ? 'bg-green-100 text-green-800' : isUpcoming ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
            {isLive ? ' Ակտիվ' : isUpcoming ? 'Մինչև սկիզբ' : 'Վերջացել է'}
          </Badge>
        </div>
      </div>
    </div>
  );
}
