'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { formatDateHy } from '@/lib/formatters';
import type { Id } from '../../../../convex/_generated/dataModel';

const STATUS_LABEL: Record<string, string> = { pending: 'Քննարկվում է', approved: 'Հաստատված', rejected: 'Մերժված', completed: 'Ավարտված' };
const STATUS_COLOR: Record<string, string> = { pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-blue-100 text-blue-800', rejected: 'bg-red-100 text-red-800', completed: 'bg-green-100 text-green-800' };

export default function AdminReturnsPage() {
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const requests = useQuery(api.returns.listAll, sessionToken ? { sessionToken } : 'skip');
  const updateStatus = useMutation(api.returns.updateStatus);

  const setStatus = async (id: Id<'returnRequests'>, status: 'pending' | 'approved' | 'rejected' | 'completed') => {
    await updateStatus({ sessionToken: sessionToken!, id, status });
    toast.success('Թարմացված');
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Վերադարձներ / Փոխանակումներ</h1>
      <div className="space-y-3">
        {requests?.map((r) => (
          <Card key={r._id}>
            <CardContent className="p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold">{r.orderNumber}</span>
                  <Badge className="border-0 text-[10px]">{r.type === 'return' ? 'Վերադարձ' : 'Փոխանակում'}</Badge>
                  <Badge className={`${STATUS_COLOR[r.status]} border-0 text-[10px]`}>{STATUS_LABEL[r.status]}</Badge>
                  <span className="text-xs text-muted-foreground">{formatDateHy(r.createdAt)}</span>
                  <span className="text-xs text-muted-foreground">· {r.customerEmail}</span>
                </div>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">Ապրանքներ՝ {r.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}</p>
                <p className="mt-1">Պատճառ՝ <span className="font-medium">{r.reason}</span></p>
                {r.comment && <p className="mt-1 text-muted-foreground">«{r.comment}»</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="h-8 text-xs text-blue-600" onClick={() => setStatus(r._id, 'approved')}>Հաստատել</Button>
                <Button size="sm" variant="outline" className="h-8 text-xs text-green-600" onClick={() => setStatus(r._id, 'completed')}>Ավարտել</Button>
                <Button size="sm" variant="outline" className="h-8 text-xs text-destructive" onClick={() => setStatus(r._id, 'rejected')}>Մերժել</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {requests?.length === 0 && <p className="py-8 text-center text-muted-foreground">Հայտեր չկան</p>}
      </div>
    </div>
  );
}
