'use client';

import { useEffect, useMemo, useState, useRef, useDeferredValue } from 'react';
import { numericInputProps } from '@/lib/utils';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Trash2, Edit, Package, Search, Upload, Download, AlertTriangle, LayoutGrid, List, Check, CheckSquare } from 'lucide-react';
import { formatPrice } from '@/lib/formatters';
import { toast } from 'sonner';
import { Id } from '../../../../convex/_generated/dataModel';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useReveal, revealStyle } from '@/lib/motion';
import Image from 'next/image';
import { useAuth } from '@/store/auth';
import { useAdminT } from '@/lib/i18n/admin';
import { useFilterName, useCategoryName } from '@/lib/i18n/filterNames';
import { pickLocalized } from '@/lib/i18n/localize';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DndContext, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const ADMIN_PRODUCTS_VIEW_KEY = 'admin-products-view-mode';

const HEALTH_LABELS: Record<string, string> = {
  noImage: 'ap.health.noImage',
  noDescription: 'ap.health.noDescription',
  zeroStock: 'ap.health.zeroStock',
  lowStock: 'ap.health.lowStock',
  noSeo: 'ap.health.noSeo',
  noBrand: 'ap.health.noBrand',
  dupSku: 'ap.health.dupSku',
};
const ADMIN_PRODUCTS_FETCH_LIMIT = 5000;
const ADMIN_PRODUCTS_PAGE_SIZE = 20;

function toArmenianUploadError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const msg = raw.toLowerCase();

  if (msg.includes('unauthorized')) return 'ap.uploadError.unauthorized';
  if (msg.includes('too many requests')) return 'ap.uploadError.tooManyRequests';
  if (msg.includes('r2 not configured')) return 'ap.uploadError.notConfigured';
  if (msg.includes('file type not allowed')) return 'ap.uploadError.fileType';
  if (msg.includes('file too large')) return 'ap.uploadError.fileTooLarge';
  if (msg.includes('no file provided')) return 'ap.uploadError.noFile';
  if (msg.includes('upload url missing')) return 'ap.uploadError.urlMissing';

  return 'ap.uploadError.generic';
}

function toArmenianUpdateError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const msg = raw.toLowerCase();

  if (msg.includes('not authenticated') || msg.includes('session expired') || msg.includes('unauthorized')) {
    return 'ap.updateError.session';
  }

  return 'ap.updateError.generic';
}

function InlineField({ value, onSave, prefix, className, plain }: { value: number; onSave: (v: number) => void; prefix?: string; className?: string; plain?: boolean }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return <input autoFocus type="text" inputMode="numeric" defaultValue={value} className={`w-20 rounded border bg-background px-2 py-0.5 text-sm outline-none focus:ring-1 focus:ring-primary ${className ?? ''}`}
      onBlur={(e) => { onSave(Number(e.target.value)); setEditing(false); }}
      onKeyDown={(e) => { if (e.key === 'Enter') { onSave(Number(e.currentTarget.value)); setEditing(false); return; } if (e.key === 'Escape') { setEditing(false); return; } const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End']; if (allowed.includes(e.key)) return; if (!/^\d$/.test(e.key)) e.preventDefault(); }} />;
  }
  return <span className={`cursor-pointer hover:underline decoration-dashed ${className ?? ''}`} onClick={() => setEditing(true)}>{prefix}{plain ? value : formatPrice(value)}</span>;
}

function InlineTextField({ value, onSave, prefix, className, placeholder }: { value?: string; onSave: (v?: string) => void; prefix?: string; className?: string; placeholder?: string }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        defaultValue={value ?? ''}
        placeholder={placeholder}
        className={`w-40 rounded border bg-background px-2 py-0.5 text-xs outline-none focus:ring-1 focus:ring-primary ${className ?? ''}`}
        onBlur={(e) => {
          const next = e.target.value.trim();
          onSave(next || undefined);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const next = e.currentTarget.value.trim();
            onSave(next || undefined);
            setEditing(false);
          }
          if (e.key === 'Escape') setEditing(false);
        }}
      />
    );
  }
  return (
    <span className={`cursor-pointer hover:underline decoration-dashed ${className ?? ''}`} onClick={() => setEditing(true)}>
      {prefix}{value || placeholder || '—'}
    </span>
  );
}

type AdminProductItem = {
  _id: Id<'products'>;
  name: string;
  nameRu?: string;
  nameEn?: string;
  price: number;
  wholesalePrice?: number;
  variantGroup?: string;
  categoryId: Id<'categories'>;
  stock: number;
  sku?: string;
  images?: string[];
  isActive: boolean;
  isFeatured?: boolean;
  attributes?: Record<string, unknown>;
};

function SortableProductShell({ id, disabled, children }: { id: string; disabled: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
    zIndex: isDragging ? 30 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

function formatAttributeValue(value: unknown): string {
  if (Array.isArray(value)) return value.map((v) => String(v)).join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  if (value === null || value === undefined) return '';
  return String(value);
}

function parseAttributeValue(raw: string, prev: unknown): unknown | undefined {
  const nextRaw = raw.trim();
  if (!nextRaw) return undefined;

  if (typeof prev === 'number') {
    const n = Number(nextRaw);
    return Number.isFinite(n) ? n : prev;
  }
  if (typeof prev === 'boolean') {
    const v = nextRaw.toLowerCase();
    if (v === 'true' || v === '1' || v === 'yes') return true;
    if (v === 'false' || v === '0' || v === 'no') return false;
    return prev;
  }
  if (Array.isArray(prev)) {
    return nextRaw.split(',').map((v) => v.trim()).filter(Boolean);
  }
  if (prev && typeof prev === 'object') {
    try {
      return JSON.parse(nextRaw);
    } catch {
      return prev;
    }
  }
  return nextRaw;
}


function AdminProductCard({ product, sessionToken, index }: { product: AdminProductItem; sessionToken: string; index: number }) {
  const { t, lang } = useAdminT();
  const name = pickLocalized(product, 'name', lang);
  const { ref, visible } = useReveal();
  const update = useMutation(api.products.update);
  const imgRef = useRef<HTMLInputElement>(null);
  const remove = useMutation(api.products.remove);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await remove({ sessionToken, id: product._id });
      toast.success(t('ap.productDeleted'));
      setDeleteOpen(false);
    } catch {
      toast.error(t('ap.deleteError'));
    } finally { setDeleting(false); }
  };

  return (
    <div ref={ref} style={revealStyle(visible, index * 0.05)}>
      <div className="group relative overflow-hidden rounded-2xl border bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
        {/* Image */}
        <input
          ref={imgRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const fd = new FormData();
              fd.append('file', file);
              const r = await fetch('/api/upload', { method: 'POST', body: fd });
              const data = await r.json().catch(() => ({} as { error?: string; publicUrl?: string; url?: string }));
              if (!r.ok) throw new Error(data.error || 'Upload failed');
              const uploadedUrl = data.publicUrl ?? data.url;
              if (!uploadedUrl) throw new Error('Upload URL missing');
              await update({ sessionToken, id: product._id, images: [...(product.images ?? []), uploadedUrl] });
              toast.success(t('ap.imageAdded'));
            } catch (error) {
              toast.error(t(toArmenianUploadError(error)));
            }
            e.target.value = '';
          }}
        />
        <div className="relative aspect-4/3 overflow-hidden bg-gradient-to-br from-muted/50 to-muted/30 cursor-pointer" onClick={() => imgRef.current?.click()}>
          {product.images?.[0] ? (
            <Image src={product.images[0]} alt={name} width={400} height={400} sizes="(max-width: 640px) 50vw, 240px" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/20"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            </div>
          )}
          <div className="absolute right-2 top-2 flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
            <Link href={`/admin/products/${product._id}/edit`}>
              <Button size="icon-sm" variant="secondary" className="h-8 w-8 shadow-md"><Edit className="h-3.5 w-3.5" /></Button>
            </Link>
            <Button size="icon-sm" variant="destructive" className="h-8 w-8 shadow-md" onClick={() => setDeleteOpen(true)}><Trash2 className="h-3.5 w-3.5" /></Button>
            <Dialog open={deleteOpen}>
              <DialogContent showCloseButton={false}>
                <DialogHeader>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  </div>
                  <DialogTitle className="text-center">{t('ap.deleteProduct')}</DialogTitle>
                  <DialogDescription className="text-center">
                    {t('ap.confirmDeleteQuestion')}<br />
                    <strong>{name}</strong>
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                  <Button variant="outline" className="flex-1" disabled={deleting} onClick={() => setDeleteOpen(false)}>{t('ap.cancel')}</Button>
                  <Button variant="destructive" className="flex-1" disabled={deleting} onClick={handleDelete}>
                    {deleting ? t('ap.deleting') : t('ap.delete')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          {!product.isActive && <Badge className="absolute left-2 top-2" variant="secondary">{t('ap.active')}</Badge>}
          {product.isFeatured && <Badge className="absolute left-2 bottom-2 bg-primary">★</Badge>}
        </div>

        {/* Content */}
        <div className="p-3">
          <div className="flex flex-col justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold text-wrap">{name}</h3>
              <p className="text-xs text-muted-foreground">{product.sku ?? '—'}</p>
              <InlineTextField
                value={product.variantGroup}
                prefix="Variant group: "
                placeholder="-"
                className="text-xs text-muted-foreground"
                onSave={(v) =>
                  update({ sessionToken, id: product._id, variantGroup: v }).then(() => toast.success(t('ap.updated'))).catch((error) => toast.error(t(toArmenianUpdateError(error))))
                }
              />
            </div>
            <InlineField value={product.price} className="text-sm font-bold text-primary" prefix={t('ap.retailPrice')} onSave={(v) => update({ sessionToken, id: product._id, price: v }).then(() => toast.success(t('ap.updated'))).catch((error) => toast.error(t(toArmenianUpdateError(error))))} />
            <InlineField value={product.wholesalePrice ?? product.price} className="text-xs text-muted-foreground" prefix={t('ap.wholesalePrice')} onSave={(v) => update({ sessionToken, id: product._id, wholesalePrice: v }).then(() => toast.success(t('ap.updated'))).catch((error) => toast.error(t(toArmenianUpdateError(error))))} />
          </div>
          <div className="mt-3 flex flex-col justify-between gap-2">
            <span className="text-xs text-muted-foreground cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); const el = e.currentTarget; const input = document.createElement('input'); input.type='text'; input.inputMode='numeric'; input.defaultValue=String(product.stock); input.className='w-16 rounded border bg-background px-1 py-0.5 text-xs outline-none'; input.onblur = () => { const v = Number(input.value); if (v !== product.stock) update({ sessionToken, id: product._id, stock: v }).then(()=>toast.success(t('ap.updated'))).catch((error)=>toast.error(t(toArmenianUpdateError(error)))); el.style.display=''; input.remove(); }; input.onkeydown=(ev)=>{ if(ev.key==='Enter'){input.blur();return;} if(ev.key==='Escape'){el.style.display='';input.remove();return;} const allowed=['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Home','End']; if(allowed.includes(ev.key))return; if(!/^\d$/.test(ev.key))ev.preventDefault();}; el.style.display='none'; el.parentElement?.insertBefore(input,el); input.focus(); }}>{t('ap.stockPrefix')}{product.stock}</span>
            <Badge variant={product.stock > 0 ? 'default' : 'destructive'} className="text-[10px]">
              {product.stock > 0 ? t('ap.inStockBadge') : t('ap.unavailable')}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

type AttrDefMeta = {
  canonicalKey: string;
  idKey: string;
  slugKey: string;
  name: string;
  type: 'select' | 'multiselect' | 'range' | 'boolean';
  options?: string[];
};

function AdminProductListRow({ product, sessionToken, index, attrMetaMap, attrDefsByCategoryMap }: { product: AdminProductItem; sessionToken: string; index: number; attrMetaMap: Map<string, AttrDefMeta>; attrDefsByCategoryMap: Map<string, AttrDefMeta[]> }) {
  const { t, lang } = useAdminT();
  const name = pickLocalized(product, 'name', lang);
  const filterName = useFilterName();
  const { ref, visible } = useReveal();
  const remove = useMutation(api.products.remove);
  const update = useMutation(api.products.update);
  const imgRef = useRef<HTMLInputElement>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const attrs = (product.attributes ?? {}) as Record<string, unknown>;
  const getAttrMeta = (key: string) => attrMetaMap.get(`${product.categoryId}:${key}`);
  const categoryDefs = attrDefsByCategoryMap.get(product.categoryId) ?? [];
  // Render all definitions for this category, even when value is currently empty.
  const entries: Array<{ key: string; val: unknown }> = [];
  const includedCanonicals = new Set<string>();

  for (const def of categoryDefs) {
    const hasId = Object.prototype.hasOwnProperty.call(attrs, def.idKey);
    const hasSlug = Object.prototype.hasOwnProperty.call(attrs, def.slugKey);
    const key = hasId ? def.idKey : (hasSlug ? def.slugKey : def.idKey);
    const val = attrs[key];
    entries.push({ key, val });
    includedCanonicals.add(def.canonicalKey);
  }

  // Also keep unknown/custom attributes that are not in filter definitions.
  const extraByCanonical = new Map<string, { key: string; val: unknown }>();
  for (const [key, val] of Object.entries(attrs)) {
    const meta = getAttrMeta(key);
    const canonical = meta?.canonicalKey ?? `raw:${key}`;
    if (includedCanonicals.has(canonical)) continue;

    const existing = extraByCanonical.get(canonical);
    const isIdLike = /^j[0-9a-z]{12,}$/i.test(key);
    if (!existing) {
      extraByCanonical.set(canonical, { key, val });
      continue;
    }
    const existingIsIdLike = /^j[0-9a-z]{12,}$/i.test(existing.key);
    // Prefer filter-id key over slug key when both represent the same attribute.
    if (isIdLike && !existingIsIdLike) {
      extraByCanonical.set(canonical, { key, val });
    }
  }

  const attrEntries = [...entries, ...Array.from(extraByCanonical.values())];
  const getAttrLabel = (key: string) => {
    const meta = getAttrMeta(key);
    if (meta?.name) return filterName(meta.name, meta.slugKey);
    if (/^j[0-9a-z]{12,}$/i.test(key)) return t('ap.attribute');
    return filterName(key, key);
  };

  const saveAttributeValue = async (key: string, nextValue: unknown | undefined) => {
    const canonical = getAttrMeta(key)?.canonicalKey;
    const nextAttrs = { ...attrs };

    if (canonical) {
      // Remove duplicate aliases (slug/id) for the same attribute before saving.
      for (const existingKey of Object.keys(nextAttrs)) {
        if (existingKey === key) continue;
        const existingCanonical = getAttrMeta(existingKey)?.canonicalKey;
        if (existingCanonical && existingCanonical === canonical) delete nextAttrs[existingKey];
      }
    }

    if (nextValue === undefined) delete nextAttrs[key];
    else nextAttrs[key] = nextValue;

    try {
      await update({
        sessionToken,
        id: product._id,
        attributes: Object.keys(nextAttrs).length ? nextAttrs : undefined,
      });
      toast.success(t('ap.attributeUpdated'));
    } catch (error) {
      toast.error(t(toArmenianUpdateError(error)));
    }
  };

  const editAttribute = async (key: string, prev: unknown) => {
    const current = formatAttributeValue(prev);
    const nextRaw = window.prompt(t('ap.updateAttributePrompt') + key, current);
    if (nextRaw === null) return;

    const nextValue = parseAttributeValue(nextRaw, prev);
    await saveAttributeValue(key, nextValue);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await remove({ sessionToken, id: product._id });
      toast.success(t('ap.productDeleted'));
      setDeleteOpen(false);
    } catch {
      toast.error(t('ap.deleteError'));
    } finally { setDeleting(false); }
  };

  return (
    <div ref={ref} style={revealStyle(visible, index * 0.03)} className="rounded-2xl border bg-card p-3 shadow-card">
      <input
        ref={imgRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            const fd = new FormData();
            fd.append('file', file);
            const r = await fetch('/api/upload', { method: 'POST', body: fd });
            const data = await r.json().catch(() => ({} as { error?: string; publicUrl?: string; url?: string }));
            if (!r.ok) throw new Error(data.error || 'Upload failed');
            const uploadedUrl = data.publicUrl ?? data.url;
            if (!uploadedUrl) throw new Error('Upload URL missing');
            await update({ sessionToken, id: product._id, images: [...(product.images ?? []), uploadedUrl] });
            toast.success(t('ap.imageUploaded'));
          } catch (error) {
            toast.error(t(toArmenianUploadError(error)));
          }
          e.target.value = '';
        }}
      />
      <div className="relative flex flex-wrap gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted/30 cursor-pointer" onClick={() => imgRef.current?.click()}>
          {product.images?.[0] ? (
            <Image src={product.images[0]} alt={name} width={128} height={128} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground/30">■</div>
          )}
          {product.isFeatured && <Badge className="absolute left-1 top-1 h-5 px-1 text-[10px]">★</Badge>}
        </div>

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold leading-snug">{name}</p>
          <p className="text-xs text-muted-foreground">{product.sku ?? '—'}</p>
          <InlineTextField
            value={product.variantGroup}
            prefix="Variant group: "
            placeholder="-"
            className="text-[11px] text-muted-foreground"
            onSave={(v) => update({ sessionToken, id: product._id, variantGroup: v }).catch((error) => toast.error(t(toArmenianUpdateError(error))))}
          />
          <div className="mt-1 flex items-center gap-2">
            <InlineField value={product.price} className="text-sm font-bold text-primary" prefix={t('ap.retailPrice')} onSave={(v) => update({ sessionToken, id: product._id, price: v }).catch((error) => toast.error(t(toArmenianUpdateError(error))))} />
            <InlineField value={product.wholesalePrice ?? product.price} className="text-xs text-muted-foreground" prefix={t('ap.wholesalePrice')} onSave={(v) => update({ sessionToken, id: product._id, wholesalePrice: v }).catch((error) => toast.error(t(toArmenianUpdateError(error))))} />
            <InlineField value={product.stock} className="text-[10px]" plain prefix={t('ap.stockPrefix')} onSave={(v) => update({ sessionToken, id: product._id, stock: v }).catch((error) => toast.error(t(toArmenianUpdateError(error))))} />
            {!product.isActive && <Badge variant="secondary" className="text-[10px]">{t('ap.inactive')}</Badge>}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {attrEntries.length > 0 ? attrEntries.map(({ key, val }) => {
              const meta = getAttrMeta(key);
              const hasOptions = !!meta?.options && meta.options.length > 0;
              const isBoolean = meta?.type === 'boolean';

              if (meta?.type === 'multiselect' && hasOptions) {
                const selected = Array.isArray(val)
                  ? val.map((v) => String(v))
                  : val === null || val === undefined || val === ''
                    ? []
                    : [String(val)];
                const summary = selected.length === 0
                  ? t('ap.select')
                  : selected.length <= 2
                    ? selected.join(', ')
                    : `${selected.length} ${t('ap.selected')}`;

                return (
                  <div key={key} className="flex items-center gap-1 rounded-md border bg-muted/30 px-2 py-1">
                    <span className="text-[10px] text-muted-foreground">{getAttrLabel(key)}:</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-6 min-w-28 rounded border bg-background px-2 text-[10px] text-left hover:border-primary">
                        {summary}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56">
                        {(meta?.options ?? []).map((opt) => {
                          const checked = selected.includes(opt);
                          return (
                            <DropdownMenuCheckboxItem
                              key={opt}
                              checked={checked}
                              onCheckedChange={(nextChecked) => {
                                const next = nextChecked
                                  ? Array.from(new Set([...selected, opt]))
                                  : selected.filter((v) => v !== opt);
                                saveAttributeValue(key, next.length > 0 ? next : undefined);
                              }}
                            >
                              {opt}
                            </DropdownMenuCheckboxItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              }

              if (hasOptions || isBoolean) {
                const options = hasOptions ? (meta?.options ?? []) : ['true', 'false'];
                const current = Array.isArray(val)
                  ? String(val[0] ?? '')
                  : typeof val === 'boolean'
                    ? String(val)
                    : String(val ?? '');

                return (
                  <div key={key} className="flex items-center gap-1 rounded-md border bg-muted/30 px-2 py-1">
                    <span className="text-[10px] text-muted-foreground">{getAttrLabel(key)}:</span>
                    <Select
                      value={current || '__empty__'}
                      onValueChange={(next) => {
                        if (next === '__empty__') {
                          saveAttributeValue(key, undefined);
                          return;
                        }
                        if (Array.isArray(val)) {
                          saveAttributeValue(key, [next]);
                          return;
                        }
                        if (typeof val === 'boolean' || isBoolean) {
                          saveAttributeValue(key, next === 'true');
                          return;
                        }
                        saveAttributeValue(key, next);
                      }}
                    >
                      <SelectTrigger className="h-6 min-w-28 border-0 bg-transparent px-1 text-[10px] focus:ring-0">
                        <SelectValue placeholder={t('ap.select')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__empty__">{t('ap.notSelected')}</SelectItem>
                        {options.map((opt) => (
                          <SelectItem key={opt} value={String(opt)}>{String(opt)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              }

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => editAttribute(key, val)}
                  className="rounded-md border bg-muted/40 px-2 py-1 text-[10px] text-left hover:border-primary hover:text-primary"
                  title={t('ap.clickToEdit')}
                >
                  {getAttrLabel(key)}: {formatAttributeValue(val)}
                </button>
              );
            }) : (
              <span className="text-[10px] text-muted-foreground">{t('ap.noAttributes')}</span>
            )}
          </div>
        </div>

        <div className="absolute right-0 top-0 flex shrink-0 gap-1">
          <Link href={`/admin/products/${product._id}/edit`}>
            <Button size="icon-sm" variant="secondary" className="h-8 w-8"><Edit className="h-3.5 w-3.5" /></Button>
          </Link>
          <Button size="icon-sm" variant="destructive" className="h-8 w-8" onClick={() => setDeleteOpen(true)}><Trash2 className="h-3.5 w-3.5" /></Button>
          <Dialog open={deleteOpen}>
            <DialogContent showCloseButton={false}>
              <DialogHeader>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <DialogTitle className="text-center">{t('ap.deleteProduct')}</DialogTitle>
                <DialogDescription className="text-center">
                  {t('ap.confirmDeleteQuestion')}<br />
                  <strong>{name}</strong>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button variant="outline" className="flex-1" disabled={deleting} onClick={() => setDeleteOpen(false)}>{t('ap.cancel')}</Button>
                <Button variant="destructive" className="flex-1" disabled={deleting} onClick={handleDelete}>{deleting ? t('ap.deleting') : t('ap.delete')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

export default function AdminProductsPage() {
  const { sessionToken } = useAuth();
  const { t } = useAdminT();
  const catName = useCategoryName();
  const reorderVariantGroup = useMutation(api.products.reorderVariantGroup);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ADMIN_PRODUCTS_PAGE_SIZE);
  const [groupOrders, setGroupOrders] = useState<Record<string, string[]>>({});
  const products = useQuery(api.products.listAdmin, { limit: ADMIN_PRODUCTS_FETCH_LIMIT });
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window === 'undefined') return 'grid';
    const saved = window.localStorage.getItem(ADMIN_PRODUCTS_VIEW_KEY);
    return saved === 'grid' || saved === 'list' ? saved : 'grid';
  });
  const [catFilter, setCatFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const categories = useQuery(api.categories.list, {});
  const allFilterDefs = useQuery(api.filters.listAll, {});
  const bulkAction = useMutation(api.products.bulkAction);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const searchTerm = search.trim().toLowerCase();
  // Defer the expensive list re-filter/re-sort (up to 5000 products) so typing
  // in the search box stays responsive — keystrokes commit instantly while the
  // heavy recompute runs at a lower priority (improves INP).
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const searchParams = useSearchParams();
  const healthFilter = searchParams.get('health');
  const dupSkuSet = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products ?? []) if (p.sku) counts.set(p.sku, (counts.get(p.sku) ?? 0) + 1);
    const set = new Set<string>();
    for (const [sku, c] of counts) if (c > 1) set.add(sku);
    return set;
  }, [products]);
  const attrMetaMap = useMemo(() => {
    const map = new Map<string, AttrDefMeta>();
    for (const def of allFilterDefs ?? []) {
      const meta: AttrDefMeta = {
        canonicalKey: `${def.categoryId}:${def._id}`,
        idKey: def._id,
        slugKey: def.slug,
        name: def.name,
        type: def.type,
        options: def.options,
      };
      map.set(`${def.categoryId}:${def._id}`, meta);
      map.set(`${def.categoryId}:${def.slug}`, meta);
    }
    return map;
  }, [allFilterDefs]);
  const attrDefsByCategoryMap = useMemo(() => {
    const map = new Map<string, AttrDefMeta[]>();
    for (const def of allFilterDefs ?? []) {
      const meta: AttrDefMeta = {
        canonicalKey: `${def.categoryId}:${def._id}`,
        idKey: def._id,
        slugKey: def.slug,
        name: def.name,
        type: def.type,
        options: def.options,
      };
      const list = map.get(def.categoryId) ?? [];
      list.push(meta);
      map.set(def.categoryId, list);
    }
    return map;
  }, [allFilterDefs]);

  const filtered = useMemo(() => {
    if (!products) return undefined;
    const result = products.filter((p) => {
      if (deferredSearchTerm) {
        const byName = p.name.toLowerCase().includes(deferredSearchTerm)
          || (p.nameRu?.toLowerCase().includes(deferredSearchTerm) ?? false)
          || (p.nameEn?.toLowerCase().includes(deferredSearchTerm) ?? false);
        const bySku = p.sku?.toLowerCase().includes(deferredSearchTerm) ?? false;
        const byAtg = p.atgCode?.toLowerCase().includes(deferredSearchTerm) ?? false;
        if (!byName && !bySku && !byAtg) return false;
      }
      if (catFilter !== 'all' && p.categoryId !== catFilter) return false;
      if (healthFilter) {
        const brand = p.brand ?? ((p.attributes ?? {}) as Record<string, unknown>).brand;
        if (healthFilter === 'noImage' && (p.images?.length ?? 0) > 0) return false;
        if (healthFilter === 'noDescription' && !!p.description?.trim()) return false;
        if (healthFilter === 'zeroStock' && !(p.isActive && p.stock <= 0)) return false;
        if (healthFilter === 'lowStock' && !(p.stock > 0 && p.stock <= 5)) return false;
        if (healthFilter === 'noSeo' && !!(p.seoTitle && p.seoDescription)) return false;
        if (healthFilter === 'noBrand' && !!brand) return false;
        if (healthFilter === 'dupSku' && !(p.sku && dupSkuSet.has(p.sku))) return false;
      }
      if (stockFilter === 'instock' && p.stock <= 0) return false;
      if (stockFilter === 'low' && (p.stock > 5 || p.stock <= 0)) return false;
      if (stockFilter === 'out' && p.stock > 0) return false;
      if (statusFilter === 'active' && !p.isActive) return false;
      if (statusFilter === 'inactive' && p.isActive) return false;
      if (statusFilter === 'featured' && !p.isFeatured) return false;
      return true;
    });
    if (sortBy === 'newest') result.sort((a, b) => b.createdAt - a.createdAt);
    else if (sortBy === 'priceAsc') result.sort((a, b) => a.price - b.price);
    else if (sortBy === 'priceDesc') result.sort((a, b) => b.price - a.price);
    else if (sortBy === 'stockAsc') result.sort((a, b) => a.stock - b.stock);
    else if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [products, deferredSearchTerm, catFilter, healthFilter, dupSkuSet, stockFilter, statusFilter, sortBy]);

  useEffect(() => {
    window.localStorage.setItem(ADMIN_PRODUCTS_VIEW_KEY, viewMode);
  }, [viewMode]);

  const orderedFiltered = useMemo(() => {
    if (!filtered) return filtered;
    const originalIndex = new Map(filtered.map((p, idx) => [String(p._id), idx]));
    const variantOrderById = new Map(filtered.map((p) => [String(p._id), p.variantOrder]));

    return [...filtered].sort((a, b) => {
      if (!a.variantGroup || a.variantGroup !== b.variantGroup) {
        return (originalIndex.get(String(a._id)) ?? 0) - (originalIndex.get(String(b._id)) ?? 0);
      }

      // Optimistic order set during a drag (takes precedence for instant feedback).
      const order = groupOrders[a.variantGroup];
      if (order && order.length > 0) {
        const ai = order.indexOf(String(a._id));
        const bi = order.indexOf(String(b._id));
        const an = ai >= 0 ? ai : Number.MAX_SAFE_INTEGER;
        const bn = bi >= 0 ? bi : Number.MAX_SAFE_INTEGER;
        if (an !== bn) return an - bn;
        return (originalIndex.get(String(a._id)) ?? 0) - (originalIndex.get(String(b._id)) ?? 0);
      }

      // Persisted order from the database (variantOrder), saved by reorderVariantGroup.
      const av = variantOrderById.get(String(a._id)) ?? Number.MAX_SAFE_INTEGER;
      const bv = variantOrderById.get(String(b._id)) ?? Number.MAX_SAFE_INTEGER;
      if (av !== bv) return av - bv;
      return (originalIndex.get(String(a._id)) ?? 0) - (originalIndex.get(String(b._id)) ?? 0);
    });
  }, [filtered, groupOrders]);

  const visibleProducts = orderedFiltered?.slice(0, visibleCount);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  const toggleSelect = (id: string) => setSelectedIds((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const exitSelect = () => { setSelectMode(false); setSelectedIds(new Set()); };
  const runBulk = async (
    op: 'activate' | 'deactivate' | 'delete' | 'setDiscount' | 'setCategory',
    extra?: { discount?: number; categoryId?: string },
  ) => {
    const ids = [...selectedIds];
    if (!ids.length || !sessionToken) return;
    setBulkBusy(true);
    try {
      const r = await bulkAction({
        sessionToken,
        ids: ids as Id<'products'>[],
        op,
        discount: extra?.discount,
        categoryId: extra?.categoryId as Id<'categories'> | undefined,
      });
      toast.success(`${r.affected} ${t('ap.productsUpdated')}`);
      setSelectedIds(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('ap.error'));
    } finally {
      setBulkBusy(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !visibleProducts) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const activeProduct = visibleProducts.find((p) => String(p._id) === activeId);
    const overProduct = visibleProducts.find((p) => String(p._id) === overId);
    if (!activeProduct || !overProduct) return;

    const group = activeProduct.variantGroup;
    if (!group || group !== overProduct.variantGroup) {
      toast.error(t('ap.sameVariantGroupOnly'));
      return;
    }

    const currentGroupIds = visibleProducts
      .filter((p) => p.variantGroup === group)
      .map((p) => String(p._id));
    const oldIndex = currentGroupIds.indexOf(activeId);
    const newIndex = currentGroupIds.indexOf(overId);
    if (oldIndex < 0 || newIndex < 0) return;

    const nextGroupIds = arrayMove(currentGroupIds, oldIndex, newIndex);
    const prevOrder = groupOrders[group];
    setGroupOrders((prev) => ({ ...prev, [group]: nextGroupIds }));

    if (!sessionToken) {
      toast.error(t('ap.sessionMissing'));
      return;
    }

    try {
      await reorderVariantGroup({
        sessionToken,
        variantGroup: group,
        items: nextGroupIds.map((id, order) => ({ id: id as Id<'products'>, order })),
      });
      toast.success(t('ap.orderSaved'));
    } catch (error) {
      setGroupOrders((prev) => ({ ...prev, [group]: prevOrder ?? currentGroupIds }));
      toast.error(t(toArmenianUpdateError(error)));
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold">{t('ap.products')}</h1>
          <p className="text-muted-foreground">{products?.length ?? 0} {t('ap.productsCountSuffix')}</p>
        </div>
        <div className="relative flex gap-2">
          <Button size="sm" className="gap-2" onClick={() => setAddMenuOpen((v) => !v)}>
            <Plus className="h-3.5 w-3.5" /> {t('ap.add')}
          </Button>
          {addMenuOpen && (
            <div className="absolute right-0 top-full z-20 mt-2 w-52 rounded-xl border bg-popover p-2 shadow-lg">
              <Link href="/admin/products/add" onClick={() => setAddMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  <Plus className="h-3.5 w-3.5" /> {t('ap.add')}</Button>
              </Link>
              <Link href="/admin/products/import" onClick={() => setAddMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <Upload className="h-3.5 w-3.5" /> {t('ap.addMany')}
                </Button>
              </Link>
              <a href="/api/export/products" download onClick={() => setAddMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <Download className="h-3.5 w-3.5" /> {t('ap.downloadCsv')}
                </Button>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[140px] sm:min-w-[180px] max-w-full sm:max-w-xs w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={t('ap.search')} className="h-9 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
        <Select value={catFilter} onValueChange={(v) => setCatFilter(v ?? 'all')}>
          <SelectTrigger className="h-9 w-full sm:w-40 min-w-0"><SelectValue>{catFilter === "all" ? t('ap.allShort') : (() => { const c = categories?.find(c => c._id === catFilter); return c ? catName(c) : t('ap.category'); })()}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('ap.allShort')}</SelectItem>
            {categories?.map((cat) => <SelectItem key={cat._id} value={cat._id}>{catName(cat)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={(v) => setStockFilter(v ?? 'all')}>
          <SelectTrigger className="h-9 w-full sm:w-36 min-w-0"><SelectValue>{{ all: t('ap.stock'), instock: t('ap.available'), low: t('ap.lowStock5'), out: t('ap.outOfStock') }[stockFilter]}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('ap.stock')}</SelectItem>
            <SelectItem value="instock">{t('ap.available')}</SelectItem>
            <SelectItem value="low">{t('ap.lowStock5')}</SelectItem>
            <SelectItem value="out">{t('ap.outOfStock')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="h-9 w-full sm:w-36 min-w-0"><SelectValue>{{ all: t('ap.status'), active: t('ap.active'), inactive: t('ap.inactive'), featured: t('ap.featured') }[statusFilter]}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('ap.status')}</SelectItem>
            <SelectItem value="active">{t('ap.active')}</SelectItem>
            <SelectItem value="inactive">{t('ap.inactive')}</SelectItem>
            <SelectItem value="featured">{t('ap.featured')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v ?? 'newest')}>
          <SelectTrigger className="h-9 w-full sm:w-36 min-w-0"><SelectValue>{{ newest: t('ap.newest'), name: t('ap.name'), priceAsc: t('ap.priceAsc'), priceDesc: t('ap.priceDesc'), stockAsc: t('ap.stockAsc') }[sortBy]}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t('ap.newest')}</SelectItem>
            <SelectItem value="name">{t('ap.name')}</SelectItem>
            <SelectItem value="priceAsc">{t('ap.priceAsc')}</SelectItem>
            <SelectItem value="priceDesc">{t('ap.priceDesc')}</SelectItem>
            <SelectItem value="stockAsc">{t('ap.stockAsc')}</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-1 rounded-lg border bg-background p-1">
          <button onClick={() => setSelectMode((v) => !v)} className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${selectMode ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`} aria-label="Select mode">
            <CheckSquare className="h-4 w-4" /> {t('ap.select')}
          </button>
          <button onClick={() => setViewMode('grid')} className={`rounded-md p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`} aria-label="Grid view">
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button onClick={() => setViewMode('list')} className={`rounded-md p-1.5 transition-colors ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`} aria-label="List view">
            <List className="h-4 w-4" />
          </button>
        </div>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground">{filtered?.length ?? 0} {t('ap.productsCountSuffix')}</p>
        {healthFilter && HEALTH_LABELS[healthFilter] && (
          <Link href="/admin/products" className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20">
            {t(HEALTH_LABELS[healthFilter])}
            <span className="text-sm leading-none">×</span>
          </Link>
        )}
        {catFilter !== 'all' && (
          <a href={`/api/export/products?category=${catFilter}`} download className="ml-auto">
            <Button size="sm" variant="outline" className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> {t('ap.downloadCsv')}
            </Button>
          </a>
        )}
      </div>

      {selectMode && (
        <div className="sticky top-2 z-30 mb-4 flex flex-wrap items-center gap-2 rounded-xl border bg-background/95 p-3 shadow-md backdrop-blur">
          <span className="text-sm font-medium">{selectedIds.size} {t('ap.selected')}</span>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set(orderedFiltered?.map((p) => String(p._id)) ?? []))}>{t('ap.allPlural')}</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>{t('ap.clear')}</Button>
          <span className="mx-1 h-5 w-px bg-border" />
          <Button size="sm" variant="outline" disabled={!selectedIds.size || bulkBusy} onClick={() => runBulk('activate')}>{t('ap.activate')}</Button>
          <Button size="sm" variant="outline" disabled={!selectedIds.size || bulkBusy} onClick={() => runBulk('deactivate')}>{t('ap.deactivate')}</Button>
          <Button size="sm" variant="outline" disabled={!selectedIds.size || bulkBusy} onClick={() => {
            const v = window.prompt(t('ap.discountPrompt'));
            if (v === null) return;
            const d = Number(v);
            if (!Number.isFinite(d) || d < 0 || d > 99) { toast.error(t('ap.invalidValue')); return; }
            runBulk('setDiscount', { discount: d });
          }}>{t('ap.discountPercent')}</Button>
          <Select value="" onValueChange={(v) => { if (v) runBulk('setCategory', { categoryId: v }); }}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder={t('ap.categoryArrow')} /></SelectTrigger>
            <SelectContent>{categories?.map((c) => <SelectItem key={c._id} value={c._id}>{catName(c)}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" variant="destructive" disabled={!selectedIds.size || bulkBusy} onClick={() => {
            if (window.confirm(t('ap.confirmDeletePrefix') + selectedIds.size + t('ap.confirmDeleteSuffix'))) runBulk('delete');
          }}>{t('ap.delete')}</Button>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={exitSelect}>{t('ap.close')}</Button>
        </div>
      )}

      {selectMode ? (
        <div
          className={viewMode === 'grid' ? 'grid gap-2' : 'flex flex-col gap-2'}
          style={viewMode === 'grid' ? { gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' } : undefined}
        >
          {visibleProducts?.map((p, i) => {
            const id = String(p._id);
            const sel = selectedIds.has(id);
            return (
              <div
                key={id}
                onClick={() => toggleSelect(id)}
                className={`relative cursor-pointer rounded-2xl ring-2 transition ${sel ? 'ring-primary' : 'ring-transparent hover:ring-primary/30'}`}
              >
                <div className={`absolute left-2 top-2 z-20 flex h-6 w-6 items-center justify-center rounded-md border-2 ${sel ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40 bg-background/80'}`}>
                  {sel && <Check className="h-4 w-4" />}
                </div>
                <div className="pointer-events-none">
                  {viewMode === 'grid'
                    ? <AdminProductCard product={p} sessionToken={sessionToken ?? ''} index={i} />
                    : <AdminProductListRow product={p} sessionToken={sessionToken ?? ''} index={i} attrMetaMap={attrMetaMap} attrDefsByCategoryMap={attrDefsByCategoryMap} />}
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'grid' ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleProducts?.map((p) => String(p._id)) ?? []} strategy={rectSortingStrategy}>
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
              {visibleProducts?.map((p, i) => (
                <SortableProductShell key={p._id} id={String(p._id)} disabled={!p.variantGroup}>
                  <AdminProductCard product={p} sessionToken={sessionToken ?? ''} index={i} />
                </SortableProductShell>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleProducts?.map((p) => String(p._id)) ?? []} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3">
              {visibleProducts?.map((p, i) => (
                <SortableProductShell key={p._id} id={String(p._id)} disabled={!p.variantGroup}>
                  <AdminProductListRow product={p} sessionToken={sessionToken ?? ''} index={i} attrMetaMap={attrMetaMap} attrDefsByCategoryMap={attrDefsByCategoryMap} />
                </SortableProductShell>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {filtered?.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Package className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground">{t('ap.noProductsFound')}</p>
          <Link href="/admin/products/add"><Button>{t('ap.addProduct')}</Button></Link>
        </div>
      )}

      {filtered && filtered.length > visibleCount && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={() => setVisibleCount((v) => Math.min(v + ADMIN_PRODUCTS_PAGE_SIZE, ADMIN_PRODUCTS_FETCH_LIMIT))}
          >
            {t('ap.loadMore')}
          </Button>
        </div>
      )}
    </div>
  );
}


