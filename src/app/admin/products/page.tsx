'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Trash2, Edit, Package, Search, Upload, AlertTriangle, LayoutGrid, List } from 'lucide-react';
import { formatPrice } from '@/lib/formatters';
import { toast } from 'sonner';
import { Id } from '../../../../convex/_generated/dataModel';
import Link from 'next/link';
import { useReveal, revealStyle } from '@/lib/motion';
import Image from 'next/image';
import { useAuth } from '@/store/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const ADMIN_PRODUCTS_VIEW_KEY = 'admin-products-view-mode';
const ADMIN_PRODUCTS_FETCH_LIMIT = 500;
const ADMIN_PRODUCTS_PAGE_SIZE = 20;

function toArmenianUploadError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const msg = raw.toLowerCase();

  if (msg.includes('unauthorized')) return 'Չկա մուտքի իրավունք։ Մուտք գործեք ադմինի հաշվով։';
  if (msg.includes('too many requests')) return 'Չափազանց շատ հարցումներ են եղել։ Փորձեք մի փոքր ուշ։';
  if (msg.includes('r2 not configured')) return 'Սերվերում նկարի պահեստավորումը կարգավորված չէ։';
  if (msg.includes('file type not allowed')) return 'Ֆայլի այս տեսակը չի թույլատրվում։';
  if (msg.includes('file too large')) return 'Ֆայլը չափազանց մեծ է (առավելագույնը 10MB)։';
  if (msg.includes('no file provided')) return 'Ֆայլ չի ընտրվել։';
  if (msg.includes('upload url missing')) return 'Վերբեռնման հղումը չի գտնվել։';

  return 'Պատկերի վերբեռնումը ձախողվեց։';
}

function toArmenianUpdateError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const msg = raw.toLowerCase();

  if (msg.includes('not authenticated') || msg.includes('session expired') || msg.includes('unauthorized')) {
    return 'Մուտքի սեսիան ավարտվել է։ Կրկին մուտք գործեք։';
  }

  return 'Թարմացումը ձախողվեց։';
}

function InlineField({ value, onSave, prefix, className, plain }: { value: number; onSave: (v: number) => void; prefix?: string; className?: string; plain?: boolean }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return <input autoFocus type="number" defaultValue={value} className={`w-20 rounded border bg-background px-2 py-0.5 text-sm outline-none focus:ring-1 focus:ring-primary ${className ?? ''}`}
      onBlur={(e) => { onSave(Number(e.target.value)); setEditing(false); }}
      onKeyDown={(e) => { if (e.key === 'Enter') { onSave(Number(e.currentTarget.value)); setEditing(false); } if (e.key === 'Escape') setEditing(false); }} />;
  }
  return <span className={`cursor-pointer hover:underline decoration-dashed ${className ?? ''}`} onClick={() => setEditing(true)}>{prefix}{plain ? value : formatPrice(value)}</span>;
}

type AdminProductItem = {
  _id: Id<'products'>;
  name: string;
  price: number;
  wholesalePrice?: number;
  categoryId: Id<'categories'>;
  stock: number;
  sku?: string;
  images?: string[];
  isActive: boolean;
  isFeatured?: boolean;
  attributes?: Record<string, unknown>;
};

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
      toast.success('Ապրանքը ջնջվել է');
      setDeleteOpen(false);
    } catch {
      toast.error('Սխալ ջնջելու ժամանակ');
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
              toast.success('Նկարը ավելացվեց');
            } catch (error) {
              toast.error(toArmenianUploadError(error));
            }
            e.target.value = '';
          }}
        />
        <div className="relative aspect-4/3 overflow-hidden bg-gradient-to-br from-muted/50 to-muted/30 cursor-pointer" onClick={() => imgRef.current?.click()}>
          {product.images?.[0] ? (
            <Image src={product.images[0]} alt={product.name} width={400} height={400} sizes="(max-width: 640px) 50vw, 240px" className="h-full w-full object-fill transition-transform duration-500 group-hover:scale-110" />
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
                  <DialogTitle className="text-center">Ջնջել ապրանքը</DialogTitle>
                  <DialogDescription className="text-center">
                    Համոզվա՞ծ եք, որ ցանկանում եք ջնջել<br />
                    <strong>{product.name}</strong>
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                  <Button variant="outline" className="flex-1" disabled={deleting} onClick={() => setDeleteOpen(false)}>Չեղարկել</Button>
                  <Button variant="destructive" className="flex-1" disabled={deleting} onClick={handleDelete}>
                    {deleting ? 'Ջնջվում է...' : 'Ջնջել'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          {!product.isActive && <Badge className="absolute left-2 top-2" variant="secondary">Ակտիվ</Badge>}
          {product.isFeatured && <Badge className="absolute left-2 bottom-2 bg-primary">★</Badge>}
        </div>

        {/* Content */}
        <div className="p-3">
          <div className="flex flex-col justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold text-wrap">{product.name}</h3>
              <p className="text-xs text-muted-foreground">{product.sku ?? '—'}</p>
            </div>
            <InlineField value={product.price} className="text-md font-bold text-primary" prefix="Մանրածախ գին: " onSave={(v) => update({ sessionToken, id: product._id, price: v }).then(() => toast.success('Թարմացվեց')).catch((error) => toast.error(toArmenianUpdateError(error)))} />
            <InlineField value={product.wholesalePrice ?? product.price} className="text-xs text-muted-foreground" prefix="Մեծածախ գին: " onSave={(v) => update({ sessionToken, id: product._id, wholesalePrice: v }).then(() => toast.success('Թարմացվեց')).catch((error) => toast.error(toArmenianUpdateError(error)))} />
          </div>
          <div className="mt-3 flex flex-col justify-between gap-2">
            <span className="text-xs text-muted-foreground cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); const el = e.currentTarget; const input = document.createElement('input'); input.type='number'; input.defaultValue=String(product.stock); input.className='w-16 rounded border bg-background px-1 py-0.5 text-xs outline-none'; input.onblur = () => { const v = Number(input.value); if (v !== product.stock) update({ sessionToken, id: product._id, stock: v }).then(()=>toast.success('Թարմացվեց')).catch((error)=>toast.error(toArmenianUpdateError(error))); el.style.display=''; input.remove(); }; input.onkeydown=(ev)=>{ if(ev.key==='Enter')input.blur(); if(ev.key==='Escape'){el.style.display='';input.remove();}}; el.style.display='none'; el.parentElement?.insertBefore(input,el); input.focus(); }}>Պահեստ: {product.stock}</span>
            <Badge variant={product.stock > 0 ? 'default' : 'destructive'} className="text-[10px]">
              {product.stock > 0 ? 'Պահեստում է' : 'Անհասանելի'}
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
  const { ref, visible } = useReveal();
  const remove = useMutation(api.products.remove);
  const update = useMutation(api.products.update);
  const imgRef = useRef<HTMLInputElement>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const attrs = (product.attributes ?? {}) as Record<string, unknown>;
  const getAttrMeta = (key: string) => attrMetaMap.get(`${product.categoryId}:${key}`);
  const categoryDefs = attrDefsByCategoryMap.get(product.categoryId) ?? [];
  const attrEntries = useMemo(() => {
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

    return [...entries, ...Array.from(extraByCanonical.values())];
  }, [attrs, attrMetaMap, attrDefsByCategoryMap, categoryDefs, product.categoryId]);
  const getAttrLabel = (key: string) => {
    const mapped = getAttrMeta(key)?.name;
    if (mapped) return mapped;
    if (/^j[0-9a-z]{12,}$/i.test(key)) return 'Ատրիբուտ';
    return key;
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
      toast.success('Ատրիբուտը թարմացվեց');
    } catch (error) {
      toast.error(toArmenianUpdateError(error));
    }
  };

  const editAttribute = async (key: string, prev: unknown) => {
    const current = formatAttributeValue(prev);
    const nextRaw = window.prompt(`Թարմացնել ատրիբուտը՝ ${key}`, current);
    if (nextRaw === null) return;

    const nextValue = parseAttributeValue(nextRaw, prev);
    await saveAttributeValue(key, nextValue);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await remove({ sessionToken, id: product._id });
      toast.success('Ապրանքը ջնջվել է');
      setDeleteOpen(false);
    } catch {
      toast.error('Սխալ ջնջելու ժամանակ');
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
            toast.success('Պատկերը վերբեռնվել է');
          } catch (error) {
            toast.error(toArmenianUploadError(error));
          }
          e.target.value = '';
        }}
      />
      <div className="flex items-center gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted/30 cursor-pointer" onClick={() => imgRef.current?.click()}>
          {product.images?.[0] ? (
            <Image src={product.images[0]} alt={product.name} width={128} height={128} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground/30">■</div>
          )}
          {product.isFeatured && <Badge className="absolute left-1 top-1 h-5 px-1 text-[10px]">★</Badge>}
        </div>

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold leading-snug">{product.name}</p>
          <p className="text-xs text-muted-foreground">{product.sku ?? '—'}</p>
          <div className="mt-1 flex items-center gap-2">
            <InlineField value={product.price} className="text-sm font-bold text-primary" prefix="Մանրածախ գին: " onSave={(v) => update({ sessionToken, id: product._id, price: v }).catch((error) => toast.error(toArmenianUpdateError(error)))} />
            <InlineField value={product.wholesalePrice ?? product.price} className="text-xs text-muted-foreground" prefix="Մեծածախ գին: " onSave={(v) => update({ sessionToken, id: product._id, wholesalePrice: v }).catch((error) => toast.error(toArmenianUpdateError(error)))} />
            <InlineField value={product.stock} className="text-[10px]" plain prefix="Պահեստ: " onSave={(v) => update({ sessionToken, id: product._id, stock: v }).catch((error) => toast.error(toArmenianUpdateError(error)))} />
            {!product.isActive && <Badge variant="secondary" className="text-[10px]">Ակտիվ չէ</Badge>}
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
                  ? 'Ընտրել'
                  : selected.length <= 2
                    ? selected.join(', ')
                    : `${selected.length} ընտրված`;

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
                        <SelectValue placeholder="Ընտրել" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__empty__">Չընտրված</SelectItem>
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
                  title="Սեղմեք՝ խմբագրելու համար"
                >
                  {getAttrLabel(key)}: {formatAttributeValue(val)}
                </button>
              );
            }) : (
              <span className="text-[10px] text-muted-foreground">Ատրիբուտներ չկան</span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-1">
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
                <DialogTitle className="text-center">Ջնջել ապրանքը</DialogTitle>
                <DialogDescription className="text-center">
                  Համոզվա՞ծ եք, որ ցանկանում եք ջնջել<br />
                  <strong>{product.name}</strong>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button variant="outline" className="flex-1" disabled={deleting} onClick={() => setDeleteOpen(false)}>Չեղարկել</Button>
                <Button variant="destructive" className="flex-1" disabled={deleting} onClick={handleDelete}>{deleting ? 'Ջնջվում է...' : 'Ջնջել'}</Button>
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
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ADMIN_PRODUCTS_PAGE_SIZE);
  const products = useQuery(api.products.list, { limit: ADMIN_PRODUCTS_FETCH_LIMIT });
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
  const searchTerm = search.trim().toLowerCase();
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

  let filtered = products?.filter((p) => {
    if (searchTerm) {
      const byName = p.name.toLowerCase().includes(searchTerm);
      const bySku = p.sku?.toLowerCase().includes(searchTerm) ?? false;
      const byAtg = p.atgCode?.toLowerCase().includes(searchTerm) ?? false;
      if (!byName && !bySku && !byAtg) return false;
    }
    if (catFilter !== 'all' && p.categoryId !== catFilter) return false;
    if (stockFilter === 'instock' && p.stock <= 0) return false;
    if (stockFilter === 'low' && (p.stock > 5 || p.stock <= 0)) return false;
    if (stockFilter === 'out' && p.stock > 0) return false;
    if (statusFilter === 'active' && !p.isActive) return false;
    if (statusFilter === 'inactive' && p.isActive) return false;
    if (statusFilter === 'featured' && !p.isFeatured) return false;
    return true;
  });
  if (filtered) {
    if (sortBy === 'newest') filtered = [...filtered].sort((a, b) => b.createdAt - a.createdAt);
    else if (sortBy === 'priceAsc') filtered = [...filtered].sort((a, b) => a.price - b.price);
    else if (sortBy === 'priceDesc') filtered = [...filtered].sort((a, b) => b.price - a.price);
    else if (sortBy === 'stockAsc') filtered = [...filtered].sort((a, b) => a.stock - b.stock);
    else if (sortBy === 'name') filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }

  useEffect(() => {
    window.localStorage.setItem(ADMIN_PRODUCTS_VIEW_KEY, viewMode);
  }, [viewMode]);

  const visibleProducts = filtered?.slice(0, visibleCount);

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold">Ապրանքներ</h1>
          <p className="text-muted-foreground">{products?.length ?? 0} ապրանք</p>
        </div>
        <div className="relative flex gap-2">
          <Button size="sm" className="gap-2" onClick={() => setAddMenuOpen((v) => !v)}>
            <Plus className="h-3.5 w-3.5" /> Ավելացնել
          </Button>
          {addMenuOpen && (
            <div className="absolute right-0 top-full z-20 mt-2 w-52 rounded-xl border bg-popover p-2 shadow-lg">
              <Link href="/admin/products/add" onClick={() => setAddMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  <Plus className="h-3.5 w-3.5" /> Ավելացնել</Button>
              </Link>
              <Link href="/admin/products/import" onClick={() => setAddMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <Upload className="h-3.5 w-3.5" /> Ավելացնել շատ
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[140px] sm:min-w-[180px] max-w-full sm:max-w-xs w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Որոնել..." className="h-9 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
        <Select value={catFilter} onValueChange={(v) => setCatFilter(v ?? 'all')}>
          <SelectTrigger className="h-9 w-full sm:w-40 min-w-0"><SelectValue>{catFilter === "all" ? "Բոլոր" : categories?.find(c => c._id === catFilter)?.name ?? "Կատեգորիա"}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Բոլոր</SelectItem>
            {categories?.map((cat) => <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={(v) => setStockFilter(v ?? 'all')}>
          <SelectTrigger className="h-9 w-full sm:w-36 min-w-0"><SelectValue>{{ all: "Պահեստ", instock: "Առկա", low: "Ցածր (≤5)", out: "Սպառված" }[stockFilter]}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Պահեստ</SelectItem>
            <SelectItem value="instock">Առկա</SelectItem>
            <SelectItem value="low">Ցածր (≤5)</SelectItem>
            <SelectItem value="out">Սպառված</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="h-9 w-full sm:w-36 min-w-0"><SelectValue>{{ all: "Կարգավիճակ", active: "Ակտիվ", inactive: "Ակտիվ չէ", featured: "Առաջարկված" }[statusFilter]}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Կարգավիճակ</SelectItem>
            <SelectItem value="active">Ակտիվ</SelectItem>
            <SelectItem value="inactive">Ակտիվ չէ</SelectItem>
            <SelectItem value="featured">Առաջարկված</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v ?? 'newest')}>
          <SelectTrigger className="h-9 w-full sm:w-36 min-w-0"><SelectValue>{{ newest: "Նորագույն", name: "Անուն", priceAsc: "Գին ↑", priceDesc: "Գին ↓", stockAsc: "Պահեստ ↑" }[sortBy]}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Նորագույն</SelectItem>
            <SelectItem value="name">Անուն</SelectItem>
            <SelectItem value="priceAsc">Գին ↑</SelectItem>
            <SelectItem value="priceDesc">Գին ↓</SelectItem>
            <SelectItem value="stockAsc">Պահեստ ↑</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-1 rounded-lg border bg-background p-1">
          <button onClick={() => setViewMode('grid')} className={`rounded-md p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`} aria-label="Grid view">
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button onClick={() => setViewMode('list')} className={`rounded-md p-1.5 transition-colors ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`} aria-label="List view">
            <List className="h-4 w-4" />
          </button>
        </div>
        </div>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{filtered?.length ?? 0} ապրանք</p>

      {viewMode === 'grid' ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
          {visibleProducts?.map((p, i) => <AdminProductCard key={p._id} product={p} sessionToken={sessionToken ?? ''} index={i} />)}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleProducts?.map((p, i) => <AdminProductListRow key={p._id} product={p} sessionToken={sessionToken ?? ''} index={i} attrMetaMap={attrMetaMap} attrDefsByCategoryMap={attrDefsByCategoryMap} />)}
        </div>
      )}

      {filtered?.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Package className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground">Ապրանքներ չեն գտնվել</p>
          <Link href="/admin/products/add"><Button>Ավելացնել ապրանք</Button></Link>
        </div>
      )}

      {filtered && filtered.length > visibleCount && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={() => setVisibleCount((v) => Math.min(v + ADMIN_PRODUCTS_PAGE_SIZE, ADMIN_PRODUCTS_FETCH_LIMIT))}
          >
            Բեռնել ավելին
          </Button>
        </div>
      )}
    </div>
  );
}


