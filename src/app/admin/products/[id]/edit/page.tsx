'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../../convex/_generated/api';
import { Id } from '../../../../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AiGenerateButton } from '@/components/admin/AiGenerateButton';import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImagePlus, X, Save, ArrowLeft } from 'lucide-react';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { useUpload } from '@/hooks/useUpload';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/store/auth';
import { useAdminT } from '@/lib/i18n/admin';
import { useFilterName } from '@/lib/i18n/filterNames';
import { numericInputProps } from '@/lib/utils';
import { VehicleCompatSelector } from '@/components/admin/VehicleCompatSelector';
import type { VehicleCompatEntry } from '@/components/admin/VehicleCompatSelector';
import { OemNumbersInput } from '@/components/admin/OemNumbersInput';

type OemEntry = { manufacturer: string; code: string };

type FormState = {
  name?: string;
  price?: number;
  costPrice?: number;
  wholesalePrice?: number;
  retailDiscount?: number;
  wholesaleDiscount?: number;
  brand?: string;
  qtyStep?: number;
  stock?: number;
  description?: string;
  descriptionRu?: string;
  descriptionEn?: string;
  seoTitle?: string;
  seoDescription?: string;
  sku?: string;
  oemNumbers?: OemEntry[];
  atgCode?: string;
  variantGroup?: string;
  categoryId?: string;
  attributes?: Record<string, unknown>;
};

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useAdminT();
  const filterName = useFilterName();
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
      costPrice: currentProduct.costPrice,
      wholesalePrice: currentProduct.wholesalePrice,
      retailDiscount: currentProduct.retailDiscount,
      wholesaleDiscount: currentProduct.wholesaleDiscount,
      brand: currentProduct.brand,
      qtyStep: currentProduct.qtyStep,
      stock: currentProduct.stock,
      description: currentProduct.description,
      descriptionRu: (currentProduct as Record<string, unknown>).descriptionRu as string | undefined,
      descriptionEn: (currentProduct as Record<string, unknown>).descriptionEn as string | undefined,
      seoTitle: (currentProduct as Record<string, unknown>).seoTitle as string | undefined,
      seoDescription: (currentProduct as Record<string, unknown>).seoDescription as string | undefined,
      oemNumbers: currentProduct.oemNumbers,
      atgCode: currentProduct.atgCode,
      variantGroup: (currentProduct as Record<string, unknown>).variantGroup as string | undefined,
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
      toast.error(t('ap.uploadFailed'));
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
      const retailPrice = form.price != null && String(form.price).trim() !== '' ? Number(form.price) : undefined;
      const wholesalePrice = form.wholesalePrice != null && String(form.wholesalePrice).trim() !== '' ? Number(form.wholesalePrice) : undefined;
      await update({
        sessionToken: sessionToken ?? '',
        id: productId,
        name: form.name,
        price: retailPrice,
        costPrice: form.costPrice ? Number(form.costPrice) : undefined,
        wholesalePrice,
        retailDiscount: form.retailDiscount != null && form.retailDiscount > 0 ? Number(form.retailDiscount) : undefined,
        wholesaleDiscount: form.wholesaleDiscount != null && form.wholesaleDiscount > 0 ? Number(form.wholesaleDiscount) : undefined,
        clearBrand: !form.brand,
        brand: form.brand || undefined,
        qtyStep: form.qtyStep || undefined,
        stock: Number(form.stock),
        description: form.description,
        descriptionRu: form.descriptionRu || undefined,
        descriptionEn: form.descriptionEn || undefined,
        seoTitle: form.seoTitle || undefined,
        seoDescription: form.seoDescription || undefined,
        sku: form.sku,
        categoryId: form.categoryId ? (form.categoryId as Id<'categories'>) : undefined,
        oemNumbers: form.oemNumbers?.length ? form.oemNumbers : undefined,
        images: images.filter(Boolean),
        attributes: form.attributes || undefined,
        atgCode: form.atgCode || undefined,
        variantGroup: form.variantGroup || undefined,
      } as Parameters<typeof update>[0]);
      toast.success(t('ap.productUpdatedSuccess'));
      router.push('/admin/products');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('Not authenticated') || msg.includes('Session expired')) {
        toast.error(t('ap.sessionExpired'));
        router.push('/login');
      } else {
        toast.error(t('ap.failedPrefix') + msg);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!currentProduct) return <div className="py-16 text-center">{t('ap.productNotFound')}</div>;

  const activeImages = images.filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/products"><Button variant="ghost" size="icon-sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold">{t('ap.editProduct')}</h1>
      </div>

      <div className="grid gap-6">
        {/* Images */}
        <Card>
          <CardHeader><CardTitle>{t('ap.images')}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeImages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setSelectedImages(selectedImages.length === activeImages.length ? [] : activeImages.map((_, i) => i))} className="rounded-full border border-border/70 bg-background/90 px-3 py-1 text-[11px] font-medium hover:border-primary hover:text-primary">
                    {selectedImages.length === activeImages.length ? t('ap.clearSelection') : t('ap.selectAll')}
                  </button>
                  {selectedImages.length > 0 && (
                    <button type="button" onClick={() => { setImages((p) => p.filter((_, i) => !selectedImages.includes(i))); setSelectedImages([]); }} className="rounded-full border border-destructive/70 bg-destructive/10 px-3 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/20">
                      {t('ap.deleteSelected')} ({selectedImages.length})
                    </button>
                  )}
                  <button type="button" onClick={() => { setImages([]); setSelectedImages([]); }} className="rounded-full border border-border/70 bg-background/90 px-3 py-1 text-[11px] font-medium hover:border-destructive hover:text-destructive">
                    {t('ap.deleteAll')}
                  </button>
                </div>
              )}
              <div className={`rounded-xl border-2 border-dashed p-2 transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-border/70 bg-muted/20'}`}
                onDrop={onDrop} onDragOver={(e) => { e.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)}>
                <div className="grid grid-cols-3 gap-3">
                  {activeImages.map((img, i) => (
                    <div key={`${img}-${i}`} className={`group relative aspect-square overflow-hidden rounded-lg border transition-all ${selectedImages.includes(i) ? 'border-primary ring-2 ring-primary/30' : 'border-border/70'}`}>
                      <button type="button" onClick={() => setSelectedImages((p) => p.includes(i) ? p.filter((x) => x !== i) : [...p, i])} className={`absolute left-1 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-[12px] font-bold shadow-md ${selectedImages.includes(i) ? 'border-primary bg-primary text-white' : 'border-primary/60 bg-white text-primary'}`}>
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
                <p className="mt-2 text-xs text-muted-foreground">{t('ap.dragImagesHint')}</p>
              </div>
            </div>
            <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={async (e) => { if (e.target.files?.length) { await appendFiles(e.target.files); e.target.value = ''; } }} />
          </CardContent>
        </Card>

        {/* Main fields */}
        <Card>
          <CardHeader><CardTitle>{t('ap.productData')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Name */}
            <div><Label>{t('ap.nameLabel')}</Label><Input value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="h-11" /></div>

            {/* SKU — right after name */}
            <div><Label>{t('ap.sku')}</Label><Input value={form.sku ?? ''} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} className="h-11 font-mono tracking-wider" placeholder="ANI-A7F3" /></div>

            {/* Category */}
            <div>
              <Label>{t('ap.category')}</Label>
              <Select value={form.categoryId ?? currentProduct.categoryId ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v || undefined, attributes: undefined }))}>
                <SelectTrigger className="h-11">
                  <SelectValue>{categories?.find((c) => c._id === (form.categoryId || currentProduct.categoryId))?.name ?? t('ap.selectCategory')}</SelectValue>
                </SelectTrigger>
                <SelectContent>{categories?.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t('ap.retailPriceAmd')}</Label><Input {...numericInputProps(true)} value={form.price ?? ''} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value ? Number(e.target.value) : undefined }))} className="h-11" /></div>
              <div><Label>{t('ap.wholesalePriceAmd')}</Label><Input {...numericInputProps(true)} value={form.wholesalePrice ?? ''} onChange={(e) => setForm((f) => ({ ...f, wholesalePrice: e.target.value ? Number(e.target.value) : undefined }))} className="h-11" /></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t('ap.costPriceAmd')}</Label><Input {...numericInputProps(true)} value={form.costPrice ?? ''} onChange={(e) => setForm((f) => ({ ...f, costPrice: Number(e.target.value) }))} className="h-11" /></div>
            </div>

            {/* Discounts */}
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('ap.discounts')}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('ap.retailDiscountPercent')}</Label>
                  <Input {...numericInputProps(false)} min={0} max={100} value={form.retailDiscount ?? ''} onChange={(e) => setForm((f) => ({ ...f, retailDiscount: e.target.value ? Number(e.target.value) : undefined }))} className="h-11" placeholder="0" />
                  <p className="mt-1 text-[11px] text-muted-foreground">{t('ap.visibleToAll')}</p>
                </div>
                <div>
                  <Label>{t('ap.wholesaleDiscountPercent')}</Label>
                  <Input {...numericInputProps(false)} min={0} max={100} value={form.wholesaleDiscount ?? ''} onChange={(e) => setForm((f) => ({ ...f, wholesaleDiscount: e.target.value ? Number(e.target.value) : undefined }))} className="h-11" placeholder="0" />
                  <p className="mt-1 text-[11px] text-muted-foreground">{t('ap.overridesPersonalDiscount')}</p>
                </div>
              </div>
            </div>

            {/* Stock / brand / atg */}
            <div className="grid grid-cols-3 gap-4">
              <div><Label>{t('ap.stock')}</Label><Input {...numericInputProps(false)} value={form.stock ?? ''} onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value) }))} className="h-11" /></div>
              <div><Label>{t('ap.qtyStep')}</Label><Input {...numericInputProps(false)} value={form.qtyStep ?? ''} onChange={(e) => setForm((f) => ({ ...f, qtyStep: Number(e.target.value) || undefined }))} className="h-11" placeholder="1" /></div>
              <div><Label>Variant Group</Label><Input value={form.variantGroup ?? ''} onChange={(e) => setForm((f) => ({ ...f, variantGroup: e.target.value }))} placeholder="dep-sun-wiper" className="h-11 font-mono" /></div>

              <div><Label>{t('ap.atgCodeLabel')}</Label><Input value={form.atgCode ?? ''} onChange={(e) => setForm((f) => ({ ...f, atgCode: e.target.value }))} placeholder="2601" className="h-11 font-mono" /></div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <Label>{t('ap.description')}</Label>
                <AiGenerateButton
                  getInput={() => ({ name: form.name ?? '', brand: form.brand, attributes: form.attributes })}
                  onResult={(r) => setForm((f) => ({ ...f, description: r.description, descriptionRu: r.descriptionRu, descriptionEn: r.descriptionEn, seoTitle: r.seoTitle, seoDescription: r.seoDescription }))}
                />
              </div>
              <Textarea value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={4} />
            </div>
            <div><Label>{t('ap.seoTitle')}</Label><Input value={form.seoTitle ?? ''} onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))} placeholder="SEO title (≤60)" /></div>
            <div><Label>{t('ap.seoDescription')}</Label><Textarea value={form.seoDescription ?? ''} onChange={(e) => setForm((f) => ({ ...f, seoDescription: e.target.value }))} rows={2} placeholder="SEO description (≤160)" /></div>
          </CardContent>
        </Card>

        {/* Attributes */}
        {filterDefs && filterDefs.length > 0 && (
          <Card>
            <CardHeader><CardTitle>{t('ap.attributes')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {filterDefs.map((def) => (
                <div key={def._id}>
                  <Label>{filterName(def.name, def.slug)}{def.unit ? ` (${def.unit})` : ''}</Label>
                  {(def.type === 'select' || def.type === 'multiselect') && def.options ? (
                    <Select value={((form.attributes ?? {})[def._id] ?? (form.attributes ?? {})[def.slug] ?? '') as string} onValueChange={(v) => setAttr(def._id, String(v ?? ''))}>
                      <SelectTrigger className="h-11"><SelectValue placeholder={filterName(def.name, def.slug)} /></SelectTrigger>
                      <SelectContent>{def.options.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : def.type === 'boolean' ? (
                    <Select value={((form.attributes ?? {})[def._id] ?? (form.attributes ?? {})[def.slug] ?? '') as string} onValueChange={(v) => setAttr(def._id, String(v ?? ''))}>
                      <SelectTrigger className="h-11"><SelectValue placeholder={filterName(def.name, def.slug)} /></SelectTrigger>
                      <SelectContent><SelectItem value="true">{t('ap.yes')}</SelectItem><SelectItem value="false">{t('ap.no')}</SelectItem></SelectContent>
                    </Select>
                  ) : (
                    <Input value={((form.attributes ?? {})[def._id] ?? (form.attributes ?? {})[def.slug] ?? '') as string} onChange={(e) => setAttr(def._id, e.target.value)} placeholder={filterName(def.name, def.slug)} className="h-11" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Vehicle compat */}
        <Card>
          <CardHeader><CardTitle>{t('ap.vehicleCompat')}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <VehicleCompatSelector
                value={((form.attributes ?? {}).vehicleCompat as VehicleCompatEntry[]) ?? []}
                onChange={(newCompat) => {
                  const base = { ...(form.attributes ?? {}) };
                  if (newCompat.length) base.vehicleCompat = newCompat;
                  else delete base.vehicleCompat;
                  setForm((f) => ({ ...f, attributes: Object.keys(base).length ? base : undefined }));
                }}
              />
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <OemNumbersInput
                  value={form.oemNumbers ?? []}
                  onChange={(v) => setForm((f) => ({ ...f, oemNumbers: v.length ? v : undefined }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
          <Save className="h-4 w-4" /> {saving ? t('ap.updating') : t('ap.update')}
        </Button>
      </div>
    </div>
  );
}
