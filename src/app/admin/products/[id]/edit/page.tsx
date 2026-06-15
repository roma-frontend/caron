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
import { numericInputProps } from '@/lib/utils';
import { VehicleCompatSelector } from '@/components/admin/VehicleCompatSelector';
import type { VehicleCompatEntry } from '@/components/admin/VehicleCompatSelector';
import { OemNumbersInput } from '@/components/admin/OemNumbersInput';

type OemEntry = { manufacturer: string; code: string };

type FormState = {
  name?: string;
  price?: number;
  wholesalePrice?: number;
  retailDiscount?: number;
  wholesaleDiscount?: number;
  brand?: string;
  qtyStep?: number;
  stock?: number;
  description?: string;
  sku?: string;
  oemNumbers?: OemEntry[];
  atgCode?: string;
  categoryId?: string;
  attributes?: Record<string, unknown>;
};

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as Id<'products'>;
  const update = useMutation(api.products.update);
  const { sessionToken } = useAuth();
  const { upload, uploading } = useUpload();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [form, setForm] = useState<FormState>({});
  const [images, setImages] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const currentProduct = useQuery(api.products.getById, { id: productId });

  if (currentProduct && !form.name) {
    setForm({
      name: currentProduct.name,
      sku: currentProduct.sku,
      price: currentProduct.price,
      wholesalePrice: currentProduct.wholesalePrice ?? currentProduct.price,
      retailDiscount: currentProduct.retailDiscount,
      wholesaleDiscount: currentProduct.wholesaleDiscount,
      brand: currentProduct.brand,
      qtyStep: currentProduct.qtyStep,
      stock: currentProduct.stock,
      description: currentProduct.description,
      oemNumbers: currentProduct.oemNumbers,
      atgCode: currentProduct.atgCode,
      categoryId: currentProduct.categoryId,
      attributes: (currentProduct.attributes as Record<string, string>) ?? {},
    });
    setImages(currentProduct.images ?? []);
  }

  const categories = useQuery(api.categories.list, {});
  const filterDefs = useQuery(
    api.filters.getByCategory,
    (form.categoryId || currentProduct?.categoryId)
      ? { categoryId: (form.categoryId || currentProduct!.categoryId) as Id<'categories'> }
      : 'skip',
  );

  const setAttr = (filterId: string, value: string) => {
    const next: Record<string, unknown> = { ...(form.attributes ?? {}), [filterId]: value };
    if (!value) delete next[filterId];
    setForm((f) => ({ ...f, attributes: next }));
  };

  const appendFiles = async (files: FileList | File[]) => {
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const url = await upload(file);
        if (url) uploaded.push(url);
      }
      if (uploaded.length) setImages((prev) => [...prev, ...uploaded]);
    } catch {
      toast.error('Վերբեռնումը ձախողվեց');
    }
  };

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (uploading || !e.dataTransfer.files?.length) return;
    await appendFiles(e.dataTransfer.files);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await update({
        sessionToken: sessionToken ?? '',
        id: productId,
        name: form.name,
        price: Number(form.price),
        wholesalePrice: form.wholesalePrice ? Number(form.wholesalePrice) : undefined,
        retailDiscount: form.retailDiscount != null && form.retailDiscount > 0 ? Number(form.retailDiscount) : undefined,
        wholesaleDiscount: form.wholesaleDiscount != null && form.wholesaleDiscount > 0 ? Number(form.wholesaleDiscount) : undefined,
        clearBrand: !form.brand,
        brand: form.brand || undefined,
        qtyStep: form.qtyStep || undefined,
        stock: Number(form.stock),
        description: form.description,
        sku: form.sku,
        categoryId: form.categoryId ? (form.categoryId as Id<'categories'>) : undefined,
        oemNumbers: form.oemNumbers?.length ? form.oemNumbers : undefined,
        images: images.filter(Boolean),
        attributes: form.attributes || undefined,
        atgCode: form.atgCode || undefined,
      } as Parameters<typeof update>[0]);
      toast.success('Ապրանքը հաջողությամբ թարմացվել է');
      router.push('/admin/products');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('Not authenticated') || msg.includes('Session expired')) {
        toast.error('Սեսիան ավարտվել է');
        router.push('/login');
      } else {
        toast.error(`Ձախողվեց: ${msg}`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!currentProduct) return <div className="py-16 text-center">Ապրանքը չի գտնվել</div>;

  const activeImages = images.filter(Boolean);

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
            <div className="space-y-3">
              {activeImages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setSelectedImages(selectedImages.length === activeImages.length ? [] : activeImages.map((_, i) => i))} className="rounded-full border border-border/70 bg-background/90 px-3 py-1 text-[11px] font-medium hover:border-primary hover:text-primary">
                    {selectedImages.length === activeImages.length ? 'Սեղմել ընտրությունը' : 'Ընտրել բոլորը'}
                  </button>
                  {selectedImages.length > 0 && (
                    <button type="button" onClick={() => { setImages((p) => p.filter((_, i) => !selectedImages.includes(i))); setSelectedImages([]); }} className="rounded-full border border-destructive/70 bg-destructive/10 px-3 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/20">
                      Ջնջել ընտրվածները ({selectedImages.length})
                    </button>
                  )}
                  <button type="button" onClick={() => { setImages([]); setSelectedImages([]); }} className="rounded-full border border-border/70 bg-background/90 px-3 py-1 text-[11px] font-medium hover:border-destructive hover:text-destructive">
                    Ջնջել բոլորը
                  </button>
                </div>
              )}
              <div className={`rounded-xl border-2 border-dashed p-2 transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-border/70 bg-muted/20'}`}
                onDrop={onDrop} onDragOver={(e) => { e.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)}>
                <div className="grid grid-cols-3 gap-3">
                  {activeImages.map((img, i) => (
                    <div key={`${img}-${i}`} className={`group relative aspect-square overflow-hidden rounded-lg border transition-all ${selectedImages.includes(i) ? 'border-primary ring-2 ring-primary/30' : 'border-border/70'}`}>
                      <button type="button" onClick={() => setSelectedImages((p) => p.includes(i) ? p.filter((x) => x !== i) : [...p, i])} className={`absolute left-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border text-[12px] ${selectedImages.includes(i) ? 'border-primary bg-primary text-white' : 'border-white/80 bg-white/95 text-muted-foreground'}`}>
                        {selectedImages.includes(i) ? '✓' : '+'}
                      </button>
                      <Image src={img} alt="" width={200} height={200} className="h-full w-full object-cover" loading="eager" />
                      <button onClick={() => setImages(images.filter((_, idx) => idx !== i))} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white opacity-100 md:opacity-0 md:group-hover:opacity-100">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => fileRef.current?.click()} className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground hover:border-primary hover:text-primary" disabled={uploading}>
                    <ImagePlus className="h-8 w-8" />
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Քաշեք նկարները կամ սեղմեք +</p>
              </div>
            </div>
            <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={async (e) => { if (e.target.files?.length) { await appendFiles(e.target.files); e.target.value = ''; } }} />
          </CardContent>
        </Card>

        {/* Main fields */}
        <Card>
          <CardHeader><CardTitle>Ապրանքի տվյալներ</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Name */}
            <div><Label>Անվանում</Label><Input value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="h-11" /></div>

            {/* SKU — right after name */}
            <div><Label>Արտիկուլ</Label><Input value={form.sku ?? ''} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} className="h-11 font-mono tracking-wider" placeholder="ANI-A7F3" /></div>

            {/* Category */}
            <div>
              <Label>Կատեգորիա</Label>
              <Select value={form.categoryId ?? currentProduct.categoryId ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v || undefined, attributes: undefined }))}>
                <SelectTrigger className="h-11">
                  <SelectValue>{categories?.find((c) => c._id === (form.categoryId || currentProduct.categoryId))?.name ?? 'Ընտրեք կատեգորիա'}</SelectValue>
                </SelectTrigger>
                <SelectContent>{categories?.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Մանրածախ գին (֏)</Label><Input {...numericInputProps(true)} value={form.price ?? ''} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} className="h-11" /></div>
              <div><Label>Մեծածախ գին (֏)</Label><Input {...numericInputProps(true)} value={form.wholesalePrice ?? ''} onChange={(e) => setForm((f) => ({ ...f, wholesalePrice: Number(e.target.value) }))} className="h-11" /></div>
            </div>

            {/* Discounts */}
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Զեղչեր</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Մանրածախ զեղչ %</Label>
                  <Input {...numericInputProps(false)} min={0} max={100} value={form.retailDiscount ?? ''} onChange={(e) => setForm((f) => ({ ...f, retailDiscount: e.target.value ? Number(e.target.value) : undefined }))} className="h-11" placeholder="0" />
                  <p className="mt-1 text-[11px] text-muted-foreground">Տեսանելի բոլոր հաճախորդներին</p>
                </div>
                <div>
                  <Label>Մեծածախ զեղչ %</Label>
                  <Input {...numericInputProps(false)} min={0} max={100} value={form.wholesaleDiscount ?? ''} onChange={(e) => setForm((f) => ({ ...f, wholesaleDiscount: e.target.value ? Number(e.target.value) : undefined }))} className="h-11" placeholder="0" />
                  <p className="mt-1 text-[11px] text-muted-foreground">Չեղարկում է հաճախորդի անձնական զեղչը</p>
                </div>
              </div>
            </div>

            {/* Stock / brand / atg */}
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Պահեստ</Label><Input {...numericInputProps(false)} value={form.stock ?? ''} onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value) }))} className="h-11" /></div>
              <div><Label>Քանակի քայլ</Label><Input {...numericInputProps(false)} value={form.qtyStep ?? ''} onChange={(e) => setForm((f) => ({ ...f, qtyStep: Number(e.target.value) || undefined }))} className="h-11" placeholder="1" /></div>
              <div><Label>ԱՏԳԱ կոդ</Label><Input value={form.atgCode ?? ''} onChange={(e) => setForm((f) => ({ ...f, atgCode: e.target.value }))} placeholder="2601" className="h-11 font-mono" /></div>
            </div>


            <OemNumbersInput value={form.oemNumbers ?? []} onChange={(v) => setForm((f) => ({ ...f, oemNumbers: v.length ? v : undefined }))} />

            <div><Label>Նկարագրություն</Label><Textarea value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={4} /></div>
          </CardContent>
        </Card>

        {/* Attributes */}
        {filterDefs && filterDefs.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Ատրիբուտներ</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {filterDefs.map((def) => (
                <div key={def._id}>
                  <Label>{def.name}{def.unit ? ` (${def.unit})` : ''}</Label>
                  {(def.type === 'select' || def.type === 'multiselect') && def.options ? (
                    <Select value={((form.attributes ?? {})[def._id] ?? (form.attributes ?? {})[def.slug] ?? '') as string} onValueChange={(v) => setAttr(def._id, String(v ?? ''))}>
                      <SelectTrigger className="h-11"><SelectValue placeholder={def.name} /></SelectTrigger>
                      <SelectContent>{def.options.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : def.type === 'boolean' ? (
                    <Select value={((form.attributes ?? {})[def._id] ?? (form.attributes ?? {})[def.slug] ?? '') as string} onValueChange={(v) => setAttr(def._id, String(v ?? ''))}>
                      <SelectTrigger className="h-11"><SelectValue placeholder={def.name} /></SelectTrigger>
                      <SelectContent><SelectItem value="true">Այո</SelectItem><SelectItem value="false">Ոչ</SelectItem></SelectContent>
                    </Select>
                  ) : (
                    <Input value={((form.attributes ?? {})[def._id] ?? (form.attributes ?? {})[def.slug] ?? '') as string} onChange={(e) => setAttr(def._id, e.target.value)} placeholder={def.name} className="h-11" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Vehicle compat */}
        <Card>
          <CardHeader><CardTitle>Համապատասխանություն ավտոմեքենայի հետ</CardTitle></CardHeader>
          <CardContent>
            <VehicleCompatSelector
              value={((form.attributes ?? {}).vehicleCompat as VehicleCompatEntry[]) ?? []}
              onChange={(newCompat) => {
                const base = { ...(form.attributes ?? {}) };
                if (newCompat.length) base.vehicleCompat = newCompat;
                else delete base.vehicleCompat;
                setForm((f) => ({ ...f, attributes: Object.keys(base).length ? base : undefined }));
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
