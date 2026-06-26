'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Wizard, WizardStep, useWizardData } from '@/components/ui/wizard';
import { AiGenerateButton } from '@/components/admin/AiGenerateButton';
import { cn, numericInputProps } from '@/lib/utils';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { ArrowLeft, ChevronDown, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { Id } from '../../../../../convex/_generated/dataModel';
import { useUpload } from '@/hooks/useUpload';
import { useRef, useCallback, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/store/auth';
import { VehicleCompatSelector } from '@/components/admin/VehicleCompatSelector';
import type { VehicleCompatEntry } from '@/components/admin/VehicleCompatSelector';
import { OemNumbersInput } from '@/components/admin/OemNumbersInput';
import { useAdminT } from '@/lib/i18n/admin';
import { useFilterName } from '@/lib/i18n/filterNames';

type OemEntry = { manufacturer: string; code: string };

function SmoothCollapseSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/70 px-3 py-2.5 text-xs shadow-sm backdrop-blur-sm">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3 text-left">
        <span className="font-semibold tracking-wide text-foreground/85">{title}</span>
        <ChevronDown className={cn('h-4 w-4 text-primary/80 transition-transform duration-300', open && 'rotate-180')} />
      </button>
      <div className={cn('grid transition-all duration-300', open ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

function StickyProductSummary({ data, update }: { data: Record<string, unknown>; update: (key: string, value: unknown) => void }) {
  const { t } = useAdminT();
  const filterName = useFilterName();
  const categories = useQuery(api.categories.list, {});
  const { upload, uploading } = useUpload();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const categoryId = data.categoryId as string | undefined;
  const categoryName = categories?.find((c) => c._id === categoryId)?.name ?? '';
  const filterDefs = useQuery(api.filters.getByCategory, categoryId ? { categoryId: categoryId as Id<'categories'> } : 'skip');
  const [descOpen, setDescOpen] = useState(false);
  const [imagesOpen, setImagesOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<number[]>([]);

  const sku = (data.sku as string) ?? '';
  const name = (data.name as string) ?? '';
  const description = (data.description as string) ?? '';
  const images = ((data.images as string[]) ?? []).filter(Boolean);
  const attributes = ((data.attributes as Record<string, string>) ?? {});
  const attrEntries = Object.entries(attributes);

  const price = (data.price as string) ?? '';
  const wholesalePrice = (data.wholesalePrice as string) ?? '';
  const stock = (data.stock as string) ?? '';
  const qtyStep = (data.qtyStep as string) ?? '';
  const atgCode = (data.atgCode as string) ?? '';

  const setAttr = (filterId: string, value: string) => {
    const next = { ...attributes, [filterId]: value };
    if (!value) delete next[filterId];
    update('attributes', next);
  };

  const appendFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    try {
      const uploaded: string[] = [];
      for (const file of arr) {
        const url = await upload(file);
        if (url) uploaded.push(url);
      }
      if (uploaded.length > 0) {
        update('images', [...images, ...uploaded]);
      }
    } catch {
      toast.error('Error');
    }
  };

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (uploading || !e.dataTransfer.files?.length) return;
    await appendFiles(e.dataTransfer.files);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragActive) setDragActive(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  return (
    <div className="rounded-2xl border border-border/70 bg-gradient-to-b from-card via-card/95 to-muted/20 p-5 shadow-lg">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold tracking-tight">{t('apf.productFill')}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t('apf.productFillHint')}</p>
        </div>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">{t('apf.smartField')}</span>
      </div>

      <div className="grid gap-3 text-xs sm:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-background/80 p-3">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{t('apf.step1Name')}</Label>
          <Input
            value={name}
            onChange={(e) => {
              update('name', e.target.value);
              update('slug', e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
            }}
            placeholder={t('apf.productName')}
            className="mt-1 h-11 border-border/70 bg-background/90"
          />
        </div>
        <div className="rounded-xl border border-border/70 bg-background/80 p-3">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{t('apf.step2Sku')}</Label>
          <Input value={sku} onChange={(e) => update('sku', e.target.value)} placeholder="ANI-A7F3" className="mt-1 h-11 border-border/70 bg-background/90 font-mono tracking-wider" />
        </div>
        <div className="rounded-xl border border-border/70 bg-background/80 p-3">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{t('apf.step3Category')}</Label>
          <select
            value={categoryId ?? ''}
            onChange={(e) => {
              update('categoryId', e.target.value || null);
              update('attributes', {});
            }}
            className="mt-1 flex h-11 w-full rounded-md border border-border/70 bg-background/90 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <option value="">{t('apf.category')}</option>
            {categories?.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          {!categoryName && <p className="mt-1 text-[11px] text-muted-foreground">{t('apf.selectCategory')}</p>}
        </div>
        <div className="rounded-xl border border-border/70 bg-background/80 p-3">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{t('apf.step4Atg')}</Label>
          <Input value={atgCode} onChange={(e) => update('atgCode', e.target.value)} placeholder="2601" className="mt-1 h-11 border-border/70 bg-background/90 font-mono" />
        </div>
      </div>

      <div className="mt-3 space-y-2.5">
        <SmoothCollapseSection title={t('apf.step5Description')} open={descOpen} onToggle={() => setDescOpen((v) => !v)}>
          <Textarea className="mt-2 border-border/70 bg-background/90" value={description} onChange={(e) => update('description', e.target.value)} placeholder={t('apf.productDescription')} rows={4} />
        </SmoothCollapseSection>

        <SmoothCollapseSection title={t('apf.step6Image')} open={imagesOpen} onToggle={() => setImagesOpen((v) => !v)}>
          <div className="mt-2 space-y-3">
            {images.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedImages.length === images.length) {
                      setSelectedImages([]);
                    } else {
                      setSelectedImages(images.map((_, idx) => idx));
                    }
                  }}
                  className="rounded-full border border-border/70 bg-background/90 px-3 py-1 text-[11px] font-medium transition hover:border-primary hover:text-primary"
                >
                  {selectedImages.length === images.length ? t('apf.clearSelection') : t('apf.selectAll')}
                </button>
                {selectedImages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      update('images', images.filter((_, idx) => !selectedImages.includes(idx)));
                      setSelectedImages([]);
                    }}
                    className="rounded-full border border-destructive/70 bg-destructive/10 px-3 py-1 text-[11px] font-medium text-destructive transition hover:bg-destructive/20"
                  >
                    {t('apf.deleteSelected')} ({selectedImages.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    update('images', []);
                    setSelectedImages([]);
                  }}
                  className="rounded-full border border-border/70 bg-background/90 px-3 py-1 text-[11px] font-medium transition hover:border-destructive hover:text-destructive"
                >
                  {t('apf.deleteAllImages')}
                </button>
              </div>
            )}
            <div
              className={`rounded-xl border-2 border-dashed p-3 transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-border/60 bg-muted/25'}`}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
            >
              <div className="grid grid-cols-4 gap-2">
                {images.map((img, i) => {
                  const selected = selectedImages.includes(i);
                  return (
                    <div key={`${img}-${i}`} className={`relative aspect-square overflow-hidden rounded-lg border transition-all ${selected ? 'border-primary ring-2 ring-primary/30' : 'border-border/70'}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedImages((prev) => prev.includes(i) ? prev.filter((idx) => idx !== i) : [...prev, i]);
                        }}
                        className={`absolute left-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border text-[12px] transition ${selected ? 'border-primary bg-primary text-white shadow-lg' : 'border-white/80 bg-white/95 text-muted-foreground shadow-sm hover:border-primary hover:text-primary'}`}
                      >
                        {selected ? '✓' : '+'}
                      </button>
                      <Image src={img} alt="" width={200} height={200} className="h-full w-full object-cover" />
                      <button onClick={() => update('images', images.filter((_, idx) => idx !== i))} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white text-[10px]">✕</button>
                    </div>
                  );
                })}
                <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground hover:border-primary hover:text-primary">
                  <ImagePlus className="h-6 w-6" />
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t('apf.dragImagesHint')}</p>
            </div>
          </div>
          <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={async (e) => { if (!e.target.files?.length) return; await appendFiles(e.target.files); e.target.value = ''; }} />
        </SmoothCollapseSection>

        <div className="rounded-xl border border-border/70 bg-background/80 px-3 py-3 text-xs">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('apf.step7Pricing')}</div>
          <div className="grid grid-cols-2 gap-2">
            <Input {...numericInputProps(false)} value={price} onChange={(e) => update('price', e.target.value)} placeholder={t('apf.retail')} className="h-11 border-border/70 bg-background/90" />
            <Input {...numericInputProps(false)} value={wholesalePrice} onChange={(e) => update('wholesalePrice', e.target.value)} placeholder={t('apf.wholesale')} className="h-11 border-border/70 bg-background/90" />
            <Input {...numericInputProps(false)} value={stock} onChange={(e) => update('stock', e.target.value)} placeholder={t('apf.quantity')} className="h-11 border-border/70 bg-background/90" />
            <Input {...numericInputProps(false)} value={qtyStep} onChange={(e) => update('qtyStep', e.target.value)} placeholder={t('apf.step')} className="h-11 border-border/70 bg-background/90" />
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-background/80 px-3 py-3 text-xs">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('apf.step8Attributes')} {attrEntries.length > 0 ? `(${attrEntries.length})` : ''}</div>
          {!categoryId ? (
            <p className="text-muted-foreground">{t('apf.selectCategoryFirst')}</p>
          ) : !filterDefs ? (
            <p className="text-muted-foreground">{t('apf.loading')}</p>
          ) : filterDefs.length === 0 ? (
            <p className="text-muted-foreground">{t('apf.noAttributes')}</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {filterDefs.map((def) => (
                <div key={def._id}>
                  <Label className="text-[11px] text-muted-foreground">{filterName(def.name, def.slug)} {def.unit ? `(${def.unit})` : ''}</Label>
                  {(def.type === 'select' || def.type === 'multiselect') && def.options ? (
                    <Select value={(attributes[def._id] ?? attributes[def.slug] ?? '') as string} onValueChange={(v) => setAttr(def._id, v != null ? String(v) : '')}>
                      <SelectTrigger className="h-11 border-border/70 bg-background/90"><SelectValue placeholder={filterName(def.name, def.slug)} /></SelectTrigger>
                      <SelectContent>{def.options.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : def.type === 'boolean' ? (
                    <Select value={(attributes[def._id] ?? attributes[def.slug] ?? '') as string} onValueChange={(v) => setAttr(def._id, v != null ? String(v) : '')}>
                      <SelectTrigger className="h-11 border-border/70 bg-background/90"><SelectValue placeholder={filterName(def.name, def.slug)} /></SelectTrigger>
                      <SelectContent><SelectItem value="true">{t('apf.yes')}</SelectItem><SelectItem value="false">{t('apf.no')}</SelectItem></SelectContent>
                    </Select>
                  ) : (
                    <Input value={(attributes[def._id] ?? attributes[def.slug] ?? '') as string} onChange={(e) => setAttr(def._id, e.target.value)} placeholder={filterName(def.name, def.slug)} className="h-11 border-border/70 bg-background/90" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepBasicInfo() {
  const { t } = useAdminT();
  const { data, update } = useWizardData();
  const attrs = ((data.attributes as Record<string, unknown>) ?? {});
  const compat = (attrs.vehicleCompat as VehicleCompatEntry[]) ?? [];
  const oemNumbers = (data.oemNumbers as OemEntry[] | undefined) ?? [];
  const [priceExtraOpen, setPriceExtraOpen] = useState(false);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);

  const compareAtPrice = Number(data.compareAtPrice) || 0;
  const price = Number(data.price) || 0;
  const discountPct = compareAtPrice > price ? Math.round((1 - price / compareAtPrice) * 100) : 0;

  const setDiscountPct = (pct: number) => {
    if (pct > 0 && price > 0) {
      update('compareAtPrice', Math.round(price / (1 - pct / 100)));
    } else {
      update('compareAtPrice', '');
    }
  };

  const handleCompatChange = useCallback((newCompat: VehicleCompatEntry[]) => {
    const next: Record<string, unknown> = { ...attrs };
    if (newCompat.length > 0) next.vehicleCompat = newCompat;
    else delete next.vehicleCompat;
    update('attributes', next);
  }, [attrs, update]);

  return (
    <div className="space-y-3">
      <SmoothCollapseSection title={t('apf.extraPriceFields')} open={priceExtraOpen} onToggle={() => setPriceExtraOpen((v) => !v)}>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-1">
          <div><Label className="text-[11px] text-muted-foreground">{t('apf.discountPct')}</Label><Input {...numericInputProps(false)} value={discountPct || ''} onChange={(e) => setDiscountPct(Number(e.target.value))} className="h-11 border-border/70 bg-background/90" min={0} max={100} /></div>
        </div>
      </SmoothCollapseSection>

      <SmoothCollapseSection title={t('apf.compatibility')} open={vehicleOpen} onToggle={() => setVehicleOpen((v) => !v)}>
        <div className="mt-2 space-y-4">
          <VehicleCompatSelector value={compat} onChange={handleCompatChange} />
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
            <OemNumbersInput
              value={oemNumbers}
              onChange={(v) => update('oemNumbers', v.length ? v : undefined)}
            />
          </div>
        </div>
      </SmoothCollapseSection>

      <SmoothCollapseSection title="SEO" open={seoOpen} onToggle={() => setSeoOpen((v) => !v)}>
        <div className="mt-2 space-y-3">
          <div className="flex justify-end">
            <AiGenerateButton
              getInput={() => ({ name: (data.name as string) ?? '', brand: data.brand as string | undefined, attributes: data.attributes as Record<string, unknown> | undefined })}
              onResult={(r) => { update('description', r.description); update('descriptionRu', r.descriptionRu); update('descriptionEn', r.descriptionEn); update('seoTitle', r.seoTitle); update('seoDescription', r.seoDescription); }}
            />
          </div>
          <div><Label className="text-[11px] text-muted-foreground">{t('apf.seoTitle')}</Label><Input value={(data.seoTitle as string) ?? ''} onChange={(e) => update('seoTitle', e.target.value)} className="h-11 border-border/70 bg-background/90" /></div>
          <div><Label className="text-[11px] text-muted-foreground">{t('apf.seoDescription')}</Label><Textarea value={(data.seoDescription as string) ?? ''} onChange={(e) => update('seoDescription', e.target.value)} rows={4} className="border-border/70 bg-background/90" /></div>
        </div>
      </SmoothCollapseSection>
    </div>
  );
}

function ChevronSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-left"
      >
        <span className="text-sm font-semibold">{title}</span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-300', open && 'rotate-180')} />
      </button>

      <div className={cn('grid transition-all duration-300', open ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function StepPricing() {
  const { t } = useAdminT();
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
    <ChevronSection title={t('apf.step2Pricing')}>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>{t('apf.retail')} (֏)</Label><Input {...numericInputProps(false)} value={(data.price as string) ?? ''} onChange={(e) => setPrice(e.target.value)} placeholder="10000" className="h-11" /></div>
          <div><Label>{t('apf.wholesale')} (֏)</Label><Input {...numericInputProps(false)} value={(data.wholesalePrice as string) ?? ''} onChange={(e) => update('wholesalePrice', e.target.value)} placeholder="9000" className="h-11" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>{t('apf.costPrice')} (֏)</Label><Input {...numericInputProps(false)} value={(data.costPrice as string) ?? ''} onChange={(e) => update('costPrice', e.target.value)} placeholder="7000" className="h-11" /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><Label>{t('apf.discountPct')}</Label><Input {...numericInputProps(false)} value={discountPct || ''} onChange={(e) => setDiscountPct(Number(e.target.value))} placeholder="20" className="h-11" min={0} max={100} /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><Label>{t('apf.atgCode')}</Label><Input value={(data.atgCode as string) ?? ''} onChange={(e) => update('atgCode', e.target.value)} placeholder="2601" className="h-11 font-mono" /></div>
          <div><Label>{t('apf.quantity')} *</Label><Input {...numericInputProps(false)} value={(data.stock as string) ?? ''} onChange={(e) => update('stock', e.target.value)} placeholder="100" className="h-11" /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><Label>{t('apf.quantityStep')}</Label><Input {...numericInputProps(false)} value={(data.qtyStep as string) ?? ''} onChange={(e) => update('qtyStep', e.target.value)} className="h-11" placeholder="1" /></div>
        </div>
      </div>
    </ChevronSection>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function StepSEO() {
  const { t } = useAdminT();
  const { data, update } = useWizardData();
  return (
    <ChevronSection title="5. SEO">
      <div className="space-y-5">
        <div className="flex justify-end">
          <AiGenerateButton
            getInput={() => ({ name: (data.name as string) ?? '', brand: data.brand as string | undefined, attributes: data.attributes as Record<string, unknown> | undefined })}
            onResult={(r) => { update('description', r.description); update('seoTitle', r.seoTitle); update('seoDescription', r.seoDescription); }}
          />
        </div>
        <div><Label>{t('apf.seoTitle')}</Label><Input value={(data.seoTitle as string) ?? ''} onChange={(e) => update('seoTitle', e.target.value)} className="h-11" /></div>
        <div><Label>{t('apf.seoDescription')}</Label><Textarea value={(data.seoDescription as string) ?? ''} onChange={(e) => update('seoDescription', e.target.value)} rows={4} /></div>
      </div>
    </ChevronSection>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function StepVehicle() {
  const { t } = useAdminT();
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

  return (
    <ChevronSection title={t('apf.step4Compat')}>
      <VehicleCompatSelector value={compat} onChange={handleChange} />
    </ChevronSection>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function StepAttributes() {
  const { t } = useAdminT();
  const filterName = useFilterName();
  const { data, update } = useWizardData();
  const categoryId = data.categoryId as string | undefined;
  const filterDefs = useQuery(api.filters.getByCategory, categoryId ? { categoryId: categoryId as Id<'categories'> } : 'skip');
  const attrs = ((data.attributes as Record<string, string>) ?? {});

  const setAttr = (filterId: string, value: string) => {
    const next = { ...attrs, [filterId]: value };
    if (!value) delete next[filterId];
    update('attributes', next);
  };

  if (!categoryId) return <ChevronSection title={t('apf.step3Attributes')}><p className="text-sm text-muted-foreground">{t('apf.selectCategoryFirst')}</p></ChevronSection>;
  if (!filterDefs) return <ChevronSection title={t('apf.step3Attributes')}><p className="text-sm text-muted-foreground">{t('apf.loadingAlt')}</p></ChevronSection>;
  if (filterDefs.length === 0) return <ChevronSection title={t('apf.step3Attributes')}><p className="text-sm text-muted-foreground">{t('apf.noAttributes')}</p></ChevronSection>;

  return (
    <ChevronSection title={t('apf.step3Attributes')}>
      <div className="space-y-4">
        {filterDefs.map((def) => (
          <div key={def._id}>
            <Label>{filterName(def.name, def.slug)} {def.unit ? `(${def.unit})` : ''}</Label>
            {(def.type === 'select' || def.type === 'multiselect') && def.options ? (
              <Select value={(attrs[def._id] ?? attrs[def.slug] ?? '') as string} onValueChange={(v) => setAttr(def._id, v != null ? String(v) : '')}>
                <SelectTrigger className="h-11"><SelectValue placeholder={filterName(def.name, def.slug)} /></SelectTrigger>
                <SelectContent>{def.options.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
              </Select>
            ) : def.type === 'boolean' ? (
              <Select value={(attrs[def._id] ?? attrs[def.slug] ?? '') as string} onValueChange={(v) => setAttr(def._id, v != null ? String(v) : '')}>
                <SelectTrigger className="h-11"><SelectValue placeholder={filterName(def.name, def.slug)} /></SelectTrigger>
                <SelectContent><SelectItem value="true">{t('apf.yes')}</SelectItem><SelectItem value="false">{t('apf.no')}</SelectItem></SelectContent>
              </Select>
            ) : (
              <Input value={(attrs[def._id] ?? attrs[def.slug] ?? '') as string} onChange={(e) => setAttr(def._id, e.target.value)} placeholder={filterName(def.name, def.slug)} className="h-11" />
            )}
          </div>
        ))}
      </div>
    </ChevronSection>
  );
}

export default function AddProductPage() {
  const { t } = useAdminT();
  const router = useRouter();
  const create = useMutation(api.products.create);
  const { sessionToken } = useAuth();

  const getMissingRequiredFields = (d: Record<string, unknown>): string[] => {
    const attrs = (d.attributes as Record<string, unknown> | undefined) ?? {};
    const missing: string[] = [];

    if (!(d.sku as string | undefined)?.trim()) missing.push(t('apf.sku'));
    if (!(d.name as string | undefined)?.trim()) missing.push(t('apf.productName'));
    if (!(d.slug as string | undefined)?.trim()) missing.push('Slug');
    if (!(d.categoryId as string | undefined)) missing.push(t('apf.category'));
    if (!(d.stock as string | undefined)) missing.push(t('apf.quantity'));
    if (Object.keys(attrs).length === 0) missing.push(t('apf.attributes'));

    return missing;
  };

  const steps: WizardStep[] = [
    {
      id: 'product-form',
      title: t('apf.productForm'),
      content: <StepBasicInfo />,
    },
  ];

  const handleComplete = async (data: Record<string, unknown>) => {
    const missing = getMissingRequiredFields(data);
    if (missing.length > 0) {
      toast.error(`${t('apf.fillRequired')}: ${missing.join(', ')}`);
      return;
    }

    await create({
      sessionToken: sessionToken ?? '',
      name: data.name as string,
      slug: data.slug as string,
      description: (data.description as string) || '',
      descriptionRu: (data.descriptionRu as string) || undefined,
      descriptionEn: (data.descriptionEn as string) || undefined,
      categoryId: data.categoryId as Id<'categories'>,
      price: data.price && String(data.price).trim() !== '' ? Number(data.price) : undefined,
      costPrice: data.costPrice ? Number(data.costPrice) : undefined,
      wholesalePrice: data.wholesalePrice && String(data.wholesalePrice).trim() !== '' ? Number(data.wholesalePrice) : undefined,
      compareAtPrice: data.compareAtPrice ? Number(data.compareAtPrice) : undefined,
      sku: (data.sku as string) || undefined,
      oemNumbers: ((data.oemNumbers as OemEntry[] | undefined) ?? []).length > 0 ? (data.oemNumbers as OemEntry[]) : undefined,
      atgCode: (data.atgCode as string) || undefined,
      stock: Number(data.stock),
      images: (data.images as string[]) ?? [],
      isActive: true,
      isFeatured: false,
      attributes: (data.attributes as Record<string, unknown>) || undefined,
    });
    toast.success(t('apf.productCreated'));
    router.push('/admin/products');
  };

  return (
    <div className="mx-auto min-h-[80vh] max-w-5xl px-4 py-8">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/admin/products"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/80 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          aria-label={t('apf.backToProducts')}
          title={t('apf.backToProducts')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{t('apf.newProduct')}</h1>
        </div>
      </div>
      <Card className="w-full overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-b from-card to-card/90" style={{ boxShadow: '0 24px 70px rgba(0,0,0,0.28)' }}>
        <Wizard
          steps={steps}
          onComplete={handleComplete}
          onCancel={() => router.push('/admin/products')}
          submitLabel={t('apf.createProduct')}
          submitOnly
          hideProgress
          renderStickySummary={({ data: wizardData, update: wizardUpdate }) => <StickyProductSummary data={wizardData} update={wizardUpdate} />}
        />
      </Card>
    </div>
  );
}
