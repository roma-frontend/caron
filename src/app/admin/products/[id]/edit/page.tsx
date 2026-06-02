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
import { ImagePlus, X, Save, ArrowLeft } from 'lucide-react';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { useUpload } from '@/hooks/useUpload';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/store/auth';
import { VehicleCompatSelector } from '@/components/admin/VehicleCompatSelector';
import type { VehicleCompatEntry } from '@/components/admin/VehicleCompatSelector';

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as Id<'products'>;
  const update = useMutation(api.products.update);
  const { sessionToken } = useAuth();
  const { upload, uploading } = useUpload();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<{ name?: string; price?: number; brand?: string; qtyStep?: number; stock?: number; description?: string; sku?: string; compareAtPrice?: number; discountPercent?: number; attributes?: Record<string, unknown> }>({});
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Load product data
  const currentProduct = useQuery(api.products.getById, { id: productId });

  // Init form when product loads
  if (currentProduct && !form.name) {
    setForm({ name: currentProduct.name, price: currentProduct.price, brand: currentProduct.brand, qtyStep: currentProduct.qtyStep, compareAtPrice: currentProduct.compareAtPrice, stock: currentProduct.stock, description: currentProduct.description, sku: currentProduct.sku, attributes: (currentProduct.attributes as Record<string, string>) ?? {} });
    setImages(currentProduct.images ?? []);
  }

  const filterDefs = useQuery(api.filters.getByCategory, currentProduct ? { categoryId: currentProduct.categoryId } : 'skip');

  const setAttr = (slug: string, value: string) => {
    const base = form.attributes ?? {};
    const next: Record<string, unknown> = { ...base, [slug]: value };
    if (!value) delete next[slug];
    setForm({ ...form, attributes: next });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await upload(file);
      if (!url) return;
      setImages((prev) => [...prev, url]);
    } catch {
      toast.error('Վերբեռնումը ձախողվեց');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await update({
        sessionToken: sessionToken ?? '',
        id: productId,
        name: form.name,
        price: Number(form.price),
        clearBrand: !form.brand,
        brand: form.brand || undefined,
        qtyStep: form.qtyStep || undefined,
        compareAtPrice: form.discountPercent === 0 ? 0 : (form.compareAtPrice || undefined),
        stock: Number(form.stock),
        description: form.description,
        sku: form.sku,
        images: images.filter(Boolean),
        attributes: form.attributes || undefined,
      });
      toast.success('Ապրանքը հաջողությամբ թարմացվել է');
      router.push('/admin/products');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Update product error:', msg);
      if (msg.includes('Not authenticated') || msg.includes('Session expired')) {
        toast.error('Սեսիան ավարտվել է, մուտք գործեք կրկին');
        router.push('/login');
      } else {
        toast.error(`Ապրանքի թարմացումը ձախողվեց: ${msg}`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!currentProduct) return <div className="py-16 text-center">Ապրանքը չի գտնվել</div>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/products"><Button variant="ghost" size="icon-sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold">Ապրանք խմբագրել</h1>
      </div>

      <div className="grid gap-6">
        {/* Images */}
        <Card>
          <CardHeader><CardTitle>Նկարներ</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {images.filter(Boolean).map((img, i) => (
                <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border">
                  <Image src={img} alt="" width={200} height={200} className="h-full w-full object-cover" loading="eager" />
                  <button onClick={() => setImages(images.filter((_, idx) => idx !== i))} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button onClick={() => fileRef.current?.click()} className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary" disabled={uploading}>
                <ImagePlus className="h-8 w-8" />
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </CardContent>
        </Card>

        {/* Fields */}
        <Card>
          <CardHeader><CardTitle>Ապրանքի տվյալներ</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Անվանում</Label><Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11" /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Գին (֏)</Label><Input type="number" value={form.price ?? ''} onChange={(e) => {
                const p = Number(e.target.value);
                const d = form.discountPercent ?? 0;
                setForm({ ...form, price: p, compareAtPrice: d > 0 && p > 0 ? Math.round(p / (1 - d / 100)) : form.compareAtPrice });
              }} className="h-11" /></div>
              <div><Label>Համեմատ. գին (֏)</Label><Input type="number" value={form.compareAtPrice ?? ''} onChange={(e) => {
                const cp = Number(e.target.value);
                const p = form.price ?? 0;
                setForm({ ...form, compareAtPrice: cp, discountPercent: cp > p ? Math.round((1 - p / cp) * 100) : 0 });
              }} className="h-11" /></div>
              <div><Label>Զեղչ %</Label><Input type="number" value={form.discountPercent ?? ''} onChange={(e) => {
                const d = Number(e.target.value);
                const p = form.price ?? 0;
                setForm({ ...form, discountPercent: d, compareAtPrice: d > 0 && p > 0 ? Math.round(p / (1 - d / 100)) : undefined });
              }} className="h-11" min={0} max={100} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Բրենդ</Label><Input value={form.brand ?? ''} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="h-11" placeholder="Bosch, Mobil..." /></div>
              <div><Label>Քանակի քայլ</Label><Input type="number" value={form.qtyStep ?? ''} onChange={(e) => setForm({ ...form, qtyStep: Number(e.target.value) })} className="h-11" placeholder="1" /></div>
              <div><Label>Պահեստ</Label><Input type="number" value={form.stock ?? ''} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} className="h-11" /></div>
            </div>
            <div><Label>Նկարագրություն</Label><Textarea value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></div>
          </CardContent>
        </Card>

        {/* Attributes */}
        {filterDefs && filterDefs.length > 0 && (
          <Card>
            <CardHeader><CardTitle>{'Ատրիբուտներ'}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {filterDefs.map((def) => (
                <div key={def._id}>
                  <Label>{def.name} {def.unit ? `(${def.unit})` : ''}</Label>
                  {(def.type === 'select' || def.type === 'multiselect') && def.options ? (
                    <Select value={((form.attributes ?? {})[def.slug] as string) ?? ''} onValueChange={(v) => setAttr(def.slug, v != null ? String(v) : '')}>
                      <SelectTrigger className="h-11"><SelectValue placeholder={def.name} /></SelectTrigger>
                      <SelectContent>{def.options.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : def.type === 'boolean' ? (
                    <Select value={((form.attributes ?? {})[def.slug] as string) ?? ''} onValueChange={(v) => setAttr(def.slug, v != null ? String(v) : '')}>
                      <SelectTrigger className="h-11"><SelectValue placeholder={def.name} /></SelectTrigger>
                      <SelectContent><SelectItem value="true">{'այո'}</SelectItem><SelectItem value="false">{'ոչ'}</SelectItem></SelectContent>
                    </Select>
                  ) : (
                    <Input value={((form.attributes ?? {})[def.slug] as string) ?? ''} onChange={(e) => setAttr(def.slug, e.target.value)} placeholder={def.name} className="h-11" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Vehicle compatibility */}
        <Card>
          <CardHeader><CardTitle>Համապատասխանություն ավտոմեքենայի հետ</CardTitle></CardHeader>
          <CardContent>
            <VehicleCompatSelector
              value={((form.attributes ?? {}).vehicleCompat as VehicleCompatEntry[]) ?? []}
              onChange={(newCompat) => {
                const base = form.attributes ?? {};
                if (newCompat.length > 0) {
                  setForm({ ...form, attributes: { ...base, vehicleCompat: newCompat } });
                } else {
                  const { vehicleCompat: _, ...rest } = base as Record<string, unknown>;
                  setForm({ ...form, attributes: Object.keys(rest).length > 0 ? rest : undefined });
                }
              }}
            />
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
          <Save className="h-4 w-4" /> {saving ? 'Թարմացվում է...' : 'Թարմացնել'}
        </Button>
      </div>
    </div>
  );
}
