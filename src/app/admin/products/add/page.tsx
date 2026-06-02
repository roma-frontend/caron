'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Wizard, WizardStep, useWizardData } from '@/components/ui/wizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { Id } from '../../../../../convex/_generated/dataModel';
import { useUpload } from '@/hooks/useUpload';
import { useRef, useCallback } from 'react';
import Image from 'next/image';
import { useAuth } from '@/store/auth';
import { VehicleCompatSelector } from '@/components/admin/VehicleCompatSelector';
import type { VehicleCompatEntry } from '@/components/admin/VehicleCompatSelector';

function StepBasicInfo() {
  const { data, update } = useWizardData();
  const categories = useQuery(api.categories.list, {});
  const { upload, uploading } = useUpload();
  const fileRef = useRef<HTMLInputElement>(null);
  const handleImg = async (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; try { const url = await upload(f); const imgs = ((data.images as string[]) ?? []); update('images', [...imgs, url]); } catch { toast.error('Error'); } };
  return (
    <div className="space-y-5">
      <div><Label>Անուն *</Label><Input value={(data.name as string) ?? ''} onChange={(e) => { update('name', e.target.value); update('slug', e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')); }} placeholder="Ապրանքի անուն" className="h-11" /></div>
      <div><Label>Slug</Label><Input value={(data.slug as string) ?? ''} onChange={(e) => update('slug', e.target.value)} placeholder="Ապրանքի սլագ" className="h-11 font-mono" /></div>
      <div>
        <Label>Կատեգորիա *</Label>
        <Select value={(data.categoryId as string) ?? ''} onValueChange={(v) => update('categoryId', v != null ? String(v) : null)}>
          <SelectTrigger className="h-11"><SelectValue placeholder="Կատեգորիա" /></SelectTrigger>
          <SelectContent>{categories?.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Նկարագրություն</Label><Textarea value={(data.description as string) ?? ''} onChange={(e) => update('description', e.target.value)} placeholder="Ապրանքի նկարագրություն" rows={4} /></div>
      <div>
        <Label>Պատկեր</Label>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {((data.images as string[]) ?? []).map((img, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-lg border">
              <Image src={img} alt="" width={200} height={200} className="h-full w-full object-cover" />
              <button onClick={() => update('images', ((data.images as string[]) ?? []).filter((_, idx) => idx !== i))} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white text-[10px]">✕</button>
            </div>
          ))}
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground hover:border-primary hover:text-primary">
            <ImagePlus className="h-6 w-6" />
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImg} />
      </div>

    </div>
  );
}

function StepPricing() {
  const { data, update } = useWizardData();

  const price = Number(data.price) || 0;
  const compareAtPrice = Number(data.compareAtPrice) || 0;
  const discountPct = compareAtPrice > price ? Math.round((1 - price / compareAtPrice) * 100) : 0;

  const setDiscountPct = (pct: number) => {
    if (pct > 0 && price > 0) {
      update('compareAtPrice', Math.round(price / (1 - pct / 100)));
    } else {
      update('compareAtPrice', '');
    }
  };

  const setPrice = (val: string) => {
    update('price', val);
    const newPrice = Number(val) || 0;
    const oldDiscount = Number(data.discountPercent) || 0;
    if (oldDiscount > 0 && newPrice > 0) {
      update('compareAtPrice', Math.round(newPrice / (1 - oldDiscount / 100)));
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div><Label>Գին (֏) *</Label><Input type="number" value={(data.price as string) ?? ''} onChange={(e) => setPrice(e.target.value)} placeholder="10000" className="h-11" /></div>
        <div><Label>Համեմատական գին (֏)</Label><Input type="number" value={(data.compareAtPrice as string) ?? ''} onChange={(e) => update('compareAtPrice', e.target.value)} placeholder="15000" className="h-11" /></div>
        <div><Label>Զեղչ %</Label><Input type="number" value={discountPct || ''} onChange={(e) => setDiscountPct(Number(e.target.value))} placeholder="20" className="h-11" min={0} max={100} /></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div><Label>АГТА код</Label><Input value={(data.atgCode as string) ?? ''} onChange={(e) => update('atgCode', e.target.value)} placeholder="2601" className="h-11 font-mono" /></div>
        <div><Label>Артикул *</Label><Input value={(data.sku as string) ?? ''} onChange={(e) => update('sku', e.target.value)} placeholder="ANI-A7F3" className="h-11 font-mono tracking-wider" /></div>
        <div><Label>Количество *</Label><Input type="number" value={(data.stock as string) ?? ''} onChange={(e) => update('stock', e.target.value)} placeholder="100" className="h-11" /></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div><Label>Քանակի քայլ</Label><Input type="number" value={(data.qtyStep as string) ?? ''} onChange={(e) => update('qtyStep', e.target.value)} className="h-11" placeholder="1" /></div>
      </div>
    </div>
  );
}

function StepSEO() {
  const { data, update } = useWizardData();
  return (
    <div className="space-y-5">
      <div><Label>SEO նկարագրություն</Label><Input value={(data.seoTitle as string) ?? ''} onChange={(e) => update('seoTitle', e.target.value)} className="h-11" /></div>
      <div><Label>SEO նկարագրություն</Label><Textarea value={(data.seoDescription as string) ?? ''} onChange={(e) => update('seoDescription', e.target.value)} rows={4} /></div>
    </div>
  );
}

function StepVehicle() {
  const { data, update } = useWizardData();
  const attrs = ((data.attributes as Record<string, unknown>) ?? {});
  const compat = (attrs.vehicleCompat as VehicleCompatEntry[]) ?? [];

  const handleChange = useCallback((newCompat: VehicleCompatEntry[]) => {
    const next: Record<string, unknown> = { ...attrs };
    if (newCompat.length > 0) {
      next.vehicleCompat = newCompat;
    } else {
      delete next.vehicleCompat;
    }
    update('attributes', next);
  }, [attrs, update]);

  return <VehicleCompatSelector value={compat} onChange={handleChange} />;
}

function StepAttributes() {
  const { data, update } = useWizardData();
  const categoryId = data.categoryId as string | undefined;
  const filterDefs = useQuery(api.filters.getByCategory, categoryId ? { categoryId: categoryId as Id<'categories'> } : 'skip');
  const attrs = ((data.attributes as Record<string, string>) ?? {});

  const setAttr = (slug: string, value: string) => {
    const next = { ...attrs, [slug]: value };
    if (!value) delete next[slug];
    update('attributes', next);
  };

  if (!categoryId) return <p className="text-sm text-muted-foreground">Նախ ընտրեք կատեգորիա</p>;
  if (!filterDefs) return <p className="text-sm text-muted-foreground">Բեռնվում Է...</p>;
  if (filterDefs.length === 0) return <p className="text-sm text-muted-foreground">Այս կատեգորիան չունի բնութագրեր</p>;

  return (
    <div className="space-y-4">
      {filterDefs.map((def) => (
        <div key={def._id}>
          <Label>{def.name} {def.unit ? `(${def.unit})` : ''}</Label>
          {(def.type === 'select' || def.type === 'multiselect') && def.options ? (
            <Select value={attrs[def.slug] ?? ''} onValueChange={(v) => setAttr(def.slug, v != null ? String(v) : '')}>
              <SelectTrigger className="h-11"><SelectValue placeholder={def.name} /></SelectTrigger>
              <SelectContent>{def.options.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
            </Select>
          ) : def.type === 'boolean' ? (
            <Select value={attrs[def.slug] ?? ''} onValueChange={(v) => setAttr(def.slug, v != null ? String(v) : '')}>
              <SelectTrigger className="h-11"><SelectValue placeholder={def.name} /></SelectTrigger>
              <SelectContent><SelectItem value="true">Այո</SelectItem><SelectItem value="false">Ոչ</SelectItem></SelectContent>
            </Select>
          ) : (
            <Input value={attrs[def.slug] ?? ''} onChange={(e) => setAttr(def.slug, e.target.value)} placeholder={def.name} className="h-11" />
          )}
        </div>
      ))}
    </div>
  );
}

export default function AddProductPage() {
  const router = useRouter();
  const create = useMutation(api.products.create);
  const { sessionToken } = useAuth();

  const steps: WizardStep[] = [
    { id: 'basic', title: 'Սկզբնական տվյալներ', content: <StepBasicInfo />, validation: (d) => !!(d.name && d.slug && d.categoryId) },
    { id: 'pricing', title: 'Գնային տվյալներ', content: <StepPricing />, validation: (d) => !!(d.price && d.stock) },
    { id: 'attributes', title: 'Բնութագրեր', content: <StepAttributes /> },
    { id: 'vehicle', title: 'Համապատասխանություն', content: <StepVehicle /> },
    { id: 'seo', title: 'SEO', content: <StepSEO /> },
  ];

  const handleComplete = async (data: Record<string, unknown>) => {
    await create({
      sessionToken: sessionToken ?? '',
      name: data.name as string,
      slug: data.slug as string,
      description: (data.description as string) || '',
      categoryId: data.categoryId as Id<'categories'>,
      price: Number(data.price),
      compareAtPrice: data.compareAtPrice ? Number(data.compareAtPrice) : undefined,
      sku: (data.sku as string) || undefined,
      atgCode: (data.atgCode as string) || undefined,
      stock: Number(data.stock),
      images: (data.images as string[]) ?? [],
      isActive: true,
      isFeatured: false,
      attributes: (data.attributes as Record<string, unknown>) || undefined,
    });
    toast.success('Ապրանքը հաջողությամբ ստեղծվեց');
    router.push('/admin/products');
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-2xl overflow-hidden rounded-2xl border-0" style={{ boxShadow: 'var(--shadow-xl)' }}>
        <Wizard steps={steps} onComplete={handleComplete} onCancel={() => router.push('/admin/products')} submitLabel="Ստեղծել ապրանք" />
      </Card>
    </div>
  );
}
