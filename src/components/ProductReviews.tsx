'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Id } from '../../convex/_generated/dataModel';
import { formatDateHy } from '@/lib/formatters';

function Stars({ rating, interactive, onChange }: { rating: number; interactive?: boolean; onChange?: (r: number) => void }) {
  return (
    <div className="flex gap-0.5" role={interactive ? 'radiogroup' : 'img'} aria-label={`${rating} из 5 звезд`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i}
          role={interactive ? 'radio' : undefined}
          aria-checked={interactive ? i === rating : undefined}
          aria-label={interactive ? `${i} звезда` : undefined}
          tabIndex={interactive ? 0 : undefined}
          className={`h-4 w-4 ${i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'} ${interactive ? 'cursor-pointer hover:scale-110 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm' : ''}`}
          onClick={() => interactive && onChange?.(i)}
          onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange?.(i); } } : undefined} />
      ))}
    </div>
  );
}

export function ProductReviews({ productId }: { productId: Id<'products'> }) {
  const reviews = useQuery(api.reviews.getByProduct, { productId });
  const stats = useQuery(api.reviews.getStats, { productId });
  const addReview = useMutation(api.reviews.create);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!name) { toast.error('Լրացրեք ձեր անունը'); return; }
    setSending(true);
    try {
      await addReview({ productId, authorName: name, rating, text: text || undefined });
      toast.success('Ապրանքը հաջողությամբ ավելացվեց');
      setShowForm(false); setName(''); setText(''); setRating(5);
    } catch { toast.error('Մեկնաբանությունը չի ավելացվել'); } finally { setSending(false); }
  };

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">{'Ապրանքի գնահատում'}</h2>
          {stats && stats.count > 0 && (
            <div className="flex items-center gap-1.5">
              <Stars rating={Math.round(stats.avg)} />
              <span className="text-sm text-muted-foreground">{stats.avg} ({stats.count})</span>
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Փակել' : 'Ավելացնել'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm">{'Ապրանքի գնահատում:'}</span>
              <Stars rating={rating} interactive onChange={setRating} />
            </div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={'Անուն'} className="h-10" />
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={'Ապրանք...'} rows={3} />
            <Button onClick={handleSubmit} disabled={sending} className="gap-2">
              <Send className="h-4 w-4" /> {sending ? 'Ուղղարկվում է․․․' : 'Ուղղարկել'}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {reviews?.map((r) => (
          <Card key={r._id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{r.authorName.charAt(0)}</div>
                  <span className="text-sm font-medium">{r.authorName}</span>
                </div>
                <span className="text-xs text-muted-foreground">{formatDateHy(r.createdAt)}</span>
              </div>
              <div className="mt-2"><Stars rating={r.rating} /></div>
              {r.text && <p className="mt-2 text-sm text-muted-foreground">{r.text}</p>}
            </CardContent>
          </Card>
        ))}
        {reviews?.length === 0 && !showForm && (
          <p className="text-center text-sm text-muted-foreground py-6">{'Գնահատումներ չեն ավելացվել'}</p>
        )}
      </div>
    </div>
  );
}
