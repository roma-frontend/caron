'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../../convex/_generated/api';
import { Id } from '../../../../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, ArrowLeft, ImagePlus } from 'lucide-react';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { useUpload } from '@/hooks/useUpload';
import Link from 'next/link';
import Image from 'next/image';

export default function EditPromotionPage() {
  const params = useParams();
  const router = useRouter();
  const promoId = params.id as Id<'promotions'>;
  const promotions = useQuery(api.promotions.list, {});
  const update = useMutation(api.promotions.update);
  const { upload, uploading } = useUpload();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', discountPercent: 0, imageUrl: '', startDate: '', endDate: '' });
  const [loaded, setLoaded] = useState(false);

  const promo = promotions?.find((p) => p._id === promoId);

  if (promo && !loaded) {
    setForm({
      title: promo.title,
      description: promo.description ?? '',
      discountPercent: promo.discountPercent ?? 0,
      imageUrl: promo.imageUrl ?? '',
      startDate: new Date(promo.startDate).toISOString().split('T')[0],
      endDate: new Date(promo.endDate).toISOString().split('T')[0],
    });
    setLoaded(true);
  }

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { const url = await upload(file); setForm({ ...form, imageUrl: url }); } catch { toast.error('Չի հաջողվել պատկերը բեռնել'); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await update({ id: promoId, title: form.title, description: form.description || undefined, discountPercent: form.discountPercent, imageUrl: form.imageUrl || undefined, startDate: new Date(form.startDate).getTime(), endDate: new Date(form.endDate).getTime() });
      toast.success('Ակցիան հաջողությամբ թարմացվեց');
      router.push('/admin/promotions');
    } catch { toast.error('Ակցիան չի հաջողվել թարմացնել'); } finally { setSaving(false); }
  };

  if (!promo) return <div className="py-16 text-center">Ակցիան չի գտնվել</div>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/promotions"><Button variant="ghost" size="icon-sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold">խմբագրել</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>խմբագրել</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Ակցիայի անուն</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-11" /></div>
          <div><Label>Ակցիայի նկարագրություն</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
          <div><Label>Զեղչ (%)</Label><Input type="number" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: Number(e.target.value) })} className="h-11" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Սկիզբ</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="h-11" /></div>
            <div><Label>Ավարտ</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="h-11" /></div>
          </div>
          <div>
            <Label>Պատկեր</Label>
            {form.imageUrl ? (
              <div className="relative mt-2 aspect-video overflow-hidden rounded-lg border">
                <Image src={form.imageUrl} alt="" className="h-full w-full object-cover" />
                <button onClick={() => setForm({ ...form, imageUrl: '' })} className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white text-xs">✕</button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-muted-foreground hover:border-primary hover:text-primary">
                <ImagePlus className="h-5 w-5" /> {uploading ? '...' : 'Ներբեռնել պատկեր'}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
          </div>
          <Button onClick={handleSave} disabled={saving} size="lg" className="w-full gap-2">
            <Save className="h-4 w-4" /> {saving ? 'Թարմացվում է...' : 'Թարմացնել'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
