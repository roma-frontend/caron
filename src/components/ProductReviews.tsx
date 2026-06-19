'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { normalizeImageUrl } from '../../convex/lib/imageUrl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Send, ShieldCheck, ThumbsUp, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { Id } from '../../convex/_generated/dataModel';
import { formatDateHy } from '@/lib/formatters';
import { useUpload } from '@/hooks/useUpload';
import { useAuthStore } from '@/store/auth';

function Stars({ rating, interactive, onChange }: { rating: number; interactive?: boolean; onChange?: (r: number) => void }) {
  return (
    <div className="flex gap-0.5" role={interactive ? 'radiogroup' : 'img'} aria-label={`${rating} 5 աստղից`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i}
          role={interactive ? 'radio' : undefined}
          aria-checked={interactive ? i === rating : undefined}
          aria-label={interactive ? `${i} աստղ` : undefined}
          tabIndex={interactive ? 0 : undefined}
          className={`h-4 w-4 ${i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'} ${interactive ? 'cursor-pointer hover:scale-110 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm' : ''}`}
          onClick={() => interactive && onChange?.(i)}
          onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange?.(i); } } : undefined} />
      ))}
    </div>
  );
}

const VOTED_KEY = 'review-helpful-votes';
function getVoted(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(VOTED_KEY) || '[]'); } catch { return []; }
}

export function ProductReviews({ productId }: { productId: Id<'products'> }) {
  const reviews = useQuery(api.reviews.getByProduct, { productId });
  const stats = useQuery(api.reviews.getStats, { productId });
  const addReview = useMutation(api.reviews.create);
  const markHelpful = useMutation(api.reviews.markHelpful);
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const { upload, uploading } = useUpload('/api/review-upload');

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const [sortBy, setSortBy] = useState<'helpful' | 'newest'>('helpful');
  const [photosOnly, setPhotosOnly] = useState(false);
  const [voted, setVoted] = useState<string[]>(getVoted);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    if (photos.length + files.length > 5) { toast.error('Առավելագույնը 5 լուսանկար'); return; }
    for (const file of files) {
      const url = await upload(file);
      if (url) setPhotos((prev) => [...prev, url]);
    }
  };

  const handleSubmit = async () => {
    if (!name) { toast.error('Լրացրեք ձեր անունը'); return; }
    setSending(true);
    try {
      await addReview({ productId, authorName: name, rating, text: text || undefined, photos: photos.length > 0 ? photos : undefined, sessionToken: sessionToken || undefined });
      toast.success('Մեկնաբանությունը հաջողությամբ ուղարկվեց և սպասում է հաստատման');
      setShowForm(false); setName(''); setText(''); setRating(5); setPhotos([]);
    } catch { toast.error('Մեկնաբանությունը չի ավելացվել'); } finally { setSending(false); }
  };

  const handleHelpful = async (id: string) => {
    if (voted.includes(id)) return;
    const next = [...voted, id];
    setVoted(next);
    localStorage.setItem(VOTED_KEY, JSON.stringify(next));
    try { await markHelpful({ id: id as Id<'reviews'> }); } catch { /* ignore */ }
  };

  const photoReviewCount = reviews?.filter((r) => r.photos && r.photos.length > 0).length ?? 0;

  const visible = (reviews ?? [])
    .filter((r) => (photosOnly ? r.photos && r.photos.length > 0 : true))
    .sort((a, b) => sortBy === 'helpful'
      ? (b.helpfulCount ?? 0) - (a.helpfulCount ?? 0) || b.createdAt - a.createdAt
      : b.createdAt - a.createdAt);

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
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

      {/* Rating distribution histogram */}
      {stats && stats.count > 0 && stats.dist && (
        <div className="mb-6 max-w-md space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const c = stats.dist[star - 1] ?? 0;
            const pct = stats.count > 0 ? Math.round((c / stats.count) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="flex w-8 shrink-0 items-center gap-0.5 text-muted-foreground">{star}<Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /></span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-yellow-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-8 shrink-0 text-right text-muted-foreground">{c}</span>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm">{'Ապրանքի գնահատում:'}</span>
              <Stars rating={rating} interactive onChange={setRating} />
            </div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={'Անուն'} className="h-10" />
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={'Ապրանք...'} rows={3} />

            {/* Photo upload */}
            <div className="flex flex-wrap items-center gap-2">
              {photos.map((url) => (
                <div key={url} className="relative h-16 w-16 overflow-hidden rounded-lg border">
                  <Image src={normalizeImageUrl(url) ?? url} alt="" fill sizes="64px" className="object-cover" />
                  <button type="button" onClick={() => setPhotos((prev) => prev.filter((p) => p !== url))}
                    className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white" aria-label="Հեռացնել">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary">
                  <ImagePlus className="h-4 w-4" />
                  <span className="text-[9px]">{uploading ? '...' : 'Լուսանկար'}</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} disabled={uploading} />
                </label>
              )}
            </div>

            <Button onClick={handleSubmit} disabled={sending || uploading} className="gap-2">
              <Send className="h-4 w-4" /> {sending ? 'Ուղղարկվում է․․․' : 'Ուղղարկել'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filter / sort toolbar */}
      {reviews && reviews.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button onClick={() => setSortBy('helpful')} className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${sortBy === 'helpful' ? 'border-transparent bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-primary'}`}>Օգտակար</button>
          <button onClick={() => setSortBy('newest')} className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${sortBy === 'newest' ? 'border-transparent bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-primary'}`}>Նոր</button>
          {photoReviewCount > 0 && (
            <button onClick={() => setPhotosOnly((v) => !v)} className={`ml-auto rounded-full border px-3 py-1 text-xs font-medium transition-colors ${photosOnly ? 'border-transparent bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-primary'}`}>
              Լուսանկարով ({photoReviewCount})
            </button>
          )}
        </div>
      )}

      <div className="space-y-3">
        {visible.map((r) => (
          <Card key={r._id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{r.authorName.charAt(0)}</div>
                  <span className="text-sm font-medium">{r.authorName}</span>
                  {r.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="h-3 w-3" /> Ստուգված գնում
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{formatDateHy(r.createdAt)}</span>
              </div>
              <div className="mt-2"><Stars rating={r.rating} /></div>
              {r.text && <p className="mt-2 text-sm text-muted-foreground">{r.text}</p>}

              {r.photos && r.photos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.photos.map((url, i) => (
                    <a key={i} href={normalizeImageUrl(url) ?? url} target="_blank" rel="noopener noreferrer" className="relative h-16 w-16 overflow-hidden rounded-lg border transition-transform hover:scale-105">
                      <Image src={normalizeImageUrl(url) ?? url} alt={`${r.authorName} լուսանկար ${i + 1}`} fill sizes="64px" className="object-cover" />
                    </a>
                  ))}
                </div>
              )}

              <div className="mt-3">
                <button onClick={() => handleHelpful(r._id)} disabled={voted.includes(r._id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${voted.includes(r._id) ? 'border-primary/40 bg-primary/5 text-primary' : 'text-muted-foreground hover:border-primary/40 hover:text-primary'}`}>
                  <ThumbsUp className={`h-3.5 w-3.5 ${voted.includes(r._id) ? 'fill-current' : ''}`} />
                  Օգտակար{(r.helpfulCount ?? 0) > 0 ? ` (${r.helpfulCount})` : ''}
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
        {reviews?.length === 0 && !showForm && (
          <p className="text-center text-sm text-muted-foreground py-6">{'Գնահատումներ չեն ավելացված'}</p>
        )}
        {reviews && reviews.length > 0 && visible.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-6">Լուսանկարով գնահատումներ չկան</p>
        )}
      </div>
    </div>
  );
}
