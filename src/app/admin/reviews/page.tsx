'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { formatDateHy } from '@/lib/formatters';

export default function AdminReviewsPage() {
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const reviews = useQuery(api.reviews.listAll, sessionToken ? { sessionToken } : 'skip');
  const approve = useMutation(api.reviews.approve);
  const remove = useMutation(api.reviews.remove);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Կարծիքներ</h1>
      <div className="space-y-3">
        {reviews?.map((r) => (
          <Card key={r._id}>
            <CardContent className="flex items-start justify-between gap-4 p-5">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{r.authorName}</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`h-3 w-3 ${i <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />)}
                  </div>
                  <Badge variant={r.isApproved ? 'default' : 'secondary'} className="text-[10px]">{r.isApproved ? 'Հաստատված' : 'Սպասում'}</Badge>
                  <span className="text-xs text-muted-foreground">{formatDateHy(r.createdAt)}</span>
                </div>
                {r.text && <p className="mt-1 text-sm text-muted-foreground">{r.text}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                {!r.isApproved && (
                  <Button size="sm" variant="outline" className="h-8 gap-1 text-xs text-green-600" onClick={async () => { await approve({ sessionToken: sessionToken!, id: r._id, approved: true }); toast.success('Հաստատված'); }}>
                    <Check className="h-3 w-3" />
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-8 gap-1 text-xs text-destructive" onClick={async () => { await remove({ sessionToken: sessionToken!, id: r._id }); toast.success('Ջնջված'); }}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {reviews?.length === 0 && <p className="py-8 text-center text-muted-foreground">Կարծիքներ չկան</p>}
      </div>
    </div>
  );
}
