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
import { Switch } from '@/components/ui/switch';
import { Save, ArrowLeft, ImagePlus, Package, X, Search } from 'lucide-react';
import { useState, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
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
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const { upload, uploading } = useUpload();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', discountPercent: 0, imageUrl: '', images: [] as string[], startDate: '', endDate: '', productIds: [] as Id<'products'>[], isActive: true });
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const allProducts = useQuery(api.products.list, { limit: 200 });

  const promo = promotions?.find((p) => p._id === promoId);

  if (promo && !loaded) {
    const existingImages = (promo.images ?? (promo.imageUrl ? [promo.imageUrl] : [])) as string[];
    setForm({
      title: promo.title,
      description: promo.description ?? '',
      discountPercent: promo.discountPercent ?? 0,
      imageUrl: promo.imageUrl ?? '',
      images: existingImages,
      startDate: new Date(promo.startDate).toISOString().split('T')[0],
      endDate: new Date(promo.endDate).toISOString().split('T')[0],
      productIds: (promo.productIds ?? []) as Id<'products'>[],
      isActive: promo.isActive,
    });
    setLoaded(true);
  }

  const handleImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    try {
      const urls: string[] = [];
      for (const f of files) { const url = await upload(f); if (url) urls.push(url); }
      setForm({ ...form, images: [...form.images, ...urls] });
    } catch { toast.error('Չի հաջողվել պատկերները բեռնել'); }
  };
  const removeImage = (i: number) => setForm({ ...form, images: form.images.filter((_, idx) => idx !== i) });

  const handleSave = async () => {
    setSaving(true);
    try {
      await update({ sessionToken: sessionToken!, id: promoId, title: form.title, description: form.description || undefined, discountPercent: form.discountPercent, imageUrl: form.images[0] || undefined, images: form.images.length > 0 ? form.images : undefined, productIds: form.productIds, startDate: new Date(form.startDate).getTime(), endDate: new Date(form.endDate).getTime(), isActive: form.isActive });
      toast.success('Ակցիան հաջողությամբ թարմացվեց');
      router.push('/admin/promotions');
    } catch { toast.error('Ակցիան չի հաջողվել թարմացնել'); } finally { setSaving(false); }
  };

  if (!promo) return <div className="py-16 text-center">Ակցիան չի գտնվել</div>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/promotions"><Button variant="ghost" size="icon-sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold">Խմբագրել</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Խմբագրել</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Ակցիայի անուն</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-11" /></div>
          <div><Label>Ակցիայի նկարագրություն</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
          <div><Label>Զեղչ (%)</Label><Input type="number" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: Number(e.target.value) })} className="h-11" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Սկիզբ</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="h-11" /></div>
            <div><Label>Ավարտ</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="h-11" /></div>
          </div>
          <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
            <div>
              <Label className="text-sm font-medium">Ակտիվ է</Label>
              <p className="text-xs text-muted-foreground">Ապաակտիվացրեք, որպեսզի թաքցնեք ակցիան կայքից</p>
            </div>
            <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
          </div>
          <div>
            <Label>Պատկերներ</Label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {form.images.map((img, i) => (
                <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
                  <Image src={img} alt="" width={200} height={200} className="h-full w-full object-cover" />
                  <button onClick={() => removeImage(i)} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 text-[10px]">✕</button>
                </div>
              ))}
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                <ImagePlus className="h-6 w-6" />
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImages} />
          </div>
          {/* Product selection */}
          <div>
            <Label>Ապրանքներ ակցիայում</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {form.productIds.length === 0 && <span className="text-sm text-muted-foreground">Ապրանքներ ընտրված չեն</span>}
              {form.productIds.map((id) => {
                const p = allProducts?.find((pr) => pr._id === id);
                return (
                  <span key={id} className="inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs">
                    {p?.name ?? id}
                    <button onClick={() => setForm({ ...form, productIds: form.productIds.filter((i) => i !== id) })} className="text-muted-foreground hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Որոնել ապրանք..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-9"
              />
            </div>
            <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border">
              {allProducts
                ?.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()))
                .slice(0, 30)
                .map((p) => {
                  const selected = form.productIds.includes(p._id);
                  return (
                    <button
                      key={p._id}
                      onClick={() => setForm({
                        ...form,
                        productIds: selected ? form.productIds.filter((i) => i !== p._id) : [...form.productIds, p._id],
                      })}
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${selected ? 'bg-primary/5 font-medium' : ''}`}
                    >
                      <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'}`}>
                        {selected && <Package className="h-2.5 w-2.5" />}
                      </div>
                      <span className="truncate">{p.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{p.price.toLocaleString('hy-AM')} ֏</span>
                    </button>
                  );
                })}
              {allProducts && allProducts.length === 0 && <p className="p-3 text-sm text-muted-foreground">Ապրանքներ չկան</p>}
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} size="lg" className="w-full gap-2">
            <Save className="h-4 w-4" /> {saving ? 'Թարմացվում է...' : 'Թարմացնել'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
