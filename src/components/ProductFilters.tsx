'use client';

import { useState, useCallback } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SlidersHorizontal, X, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { Id } from '../../convex/_generated/dataModel';
import { PRODUCT } from '@/lib/constants';
import { useSettings } from '@/hooks/useSettings';

type FilterValues = Record<string, unknown>;
type Filters = { categoryId?: Id<'categories'>; minPrice?: number; maxPrice?: number; inStockOnly?: boolean; onSale?: boolean; minRating?: number; sort?: string; attributes?: FilterValues };

interface Props {
  categoryId?: Id<'categories'>;
  onFilterChange: (filters: Filters) => void;
  activeFilters: Filters;
}


export function ProductFilters({ categoryId, onFilterChange, activeFilters }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeCount = (activeFilters.categoryId ? 1 : 0) + (activeFilters.minPrice ? 1 : 0) + (activeFilters.maxPrice ? 1 : 0) + (activeFilters.inStockOnly ? 1 : 0) + (activeFilters.onSale ? 1 : 0) + (activeFilters.minRating ? 1 : 0) + Object.keys(activeFilters.attributes || {}).length;

  return (
    <>
      {/* Desktop sidebar - always visible */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-24 space-y-1">
          <FilterContent categoryId={categoryId} onFilterChange={onFilterChange} activeFilters={activeFilters} />
        </div>
      </aside>

      {/* Mobile trigger button */}
      <div className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-40 lg:hidden">
        <Button onClick={() => setMobileOpen(true)} size="lg" className="rounded-full shadow-xl shadow-primary/25 gap-2 px-6">
          <SlidersHorizontal className="h-4 w-4" />
          {PRODUCT.filters}
          {activeCount > 0 && <Badge variant="secondary" className="ml-1 h-5 min-w-5 rounded-full p-0 text-xs flex items-center justify-center">{activeCount}</Badge>}
        </Button>
      </div>

      {/* Mobile bottom sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto px-5 pb-8 pt-0" showCloseButton={false}>
          <div className="flex items-center justify-between sticky top-0 bg-popover z-10 pt-4 pb-3 border-b mb-4">
            <h3 className="font-semibold text-base">{PRODUCT.filters}</h3>
            <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <FilterContent categoryId={categoryId} onFilterChange={onFilterChange} activeFilters={activeFilters} />
          <div className="mt-6">
            <Button className="w-full rounded-xl" onClick={() => setMobileOpen(false)}>Կիռառել</Button>
          </div>
        </SheetContent>
      </Sheet>

    </>
  );
}


export function SortBar({ activeFilters, onFilterChange }: { activeFilters: Filters; onFilterChange: (f: Filters) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {[
        { key: 'newest', label: PRODUCT.sortNewest },
        { key: 'priceAsc', label: PRODUCT.sortPriceAsc },
        { key: 'priceDesc', label: PRODUCT.sortPriceDesc },
        { key: 'popular', label: PRODUCT.sortPopular },
      ].map((s) => (
        <Button key={s.key} variant={activeFilters.sort === s.key ? 'default' : 'ghost'} size="sm" className="rounded-full text-xs"
          onClick={() => onFilterChange({ ...activeFilters, sort: activeFilters.sort === s.key ? undefined : s.key })}
        >{s.label}</Button>
      ))}
    </div>
  );
}


function FilterContent({ categoryId, onFilterChange, activeFilters }: Props) {
  const settings = useSettings();
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['category', 'price', 'sale', 'rating']));
  const selectedCat = activeFilters.categoryId ?? categoryId;
  const filterDefs = useQuery(api.filters.getByCategory, selectedCat ? { categoryId: selectedCat } : 'skip');
  const categories = useQuery(api.categories.list, {});

  const toggle = (key: string) => setExpanded((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const updateAttr = (slug: string, value: unknown) => {
    const attrs = { ...(activeFilters.attributes || {}) } as FilterValues;
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) delete attrs[slug];
    else attrs[slug] = value;
    onFilterChange({ ...activeFilters, attributes: Object.keys(attrs).length > 0 ? attrs : undefined });
  };

  const toggleMulti = (slug: string, option: string) => {
    const current = ((activeFilters.attributes || {})[slug] as string[]) || [];
    const next = current.includes(option) ? current.filter((v) => v !== option) : [...current, option];
    updateAttr(slug, next);
  };

  const activeCount = (activeFilters.categoryId ? 1 : 0) + (activeFilters.minPrice ? 1 : 0) + (activeFilters.maxPrice ? 1 : 0) + (activeFilters.inStockOnly ? 1 : 0) + (activeFilters.onSale ? 1 : 0) + (activeFilters.minRating ? 1 : 0) + Object.keys(activeFilters.attributes || {}).length;

  return (
    <div className="space-y-5">
      {activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={() => onFilterChange({ sort: activeFilters.sort })} className="gap-1.5 text-xs w-full justify-start text-muted-foreground hover:text-foreground">
          <RotateCcw className="h-3 w-3" /> Չեղարկել
        </Button>
      )}

      {/* Category */}
      {!categoryId && categories && (
        <Section title="Կատեգորիա" k="category" expanded={expanded} toggle={toggle}>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Badge key={c._id} variant={activeFilters.categoryId === c._id ? 'default' : 'outline'}
                className="cursor-pointer text-xs transition-all hover:scale-105 px-3 py-1.5"
                onClick={() => onFilterChange({ ...activeFilters, categoryId: activeFilters.categoryId === c._id ? undefined : c._id, attributes: undefined })}
              >{c.name}</Badge>
            ))}
          </div>
        </Section>
      )}

      {/* Price - Dual Range Slider */}
      {settings?.enablePriceFilter !== false && <Section title="Գին" k="price" expanded={expanded} toggle={toggle}>
        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground mb-1 block">Սկսած</label>
            <Input type="number" placeholder="0" className="h-8 text-xs" value={activeFilters.minPrice ?? ''}
              onChange={(e) => onFilterChange({ ...activeFilters, minPrice: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground mb-1 block">Մինչև</label>
            <Input type="number" placeholder="100000" className="h-8 text-xs" value={activeFilters.maxPrice ?? ''}
              onChange={(e) => onFilterChange({ ...activeFilters, maxPrice: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
        </div>
        {/* Visual range bar */}
        <div className="relative h-2 rounded-full bg-muted overflow-hidden">
          <div className="absolute h-full rounded-full bg-primary/30" style={{
            left: `${Math.min(100, ((activeFilters.minPrice ?? 0) / 100000) * 100)}%`,
            right: `${100 - Math.min(100, ((activeFilters.maxPrice ?? 100000) / 100000) * 100)}%`,
          }} />
          <input type="range" min={0} max={100000} step={1000} value={activeFilters.minPrice ?? 0}
            onChange={(e) => onFilterChange({ ...activeFilters, minPrice: Number(e.target.value) || undefined })}
            className="absolute inset-0 w-full opacity-0 cursor-pointer" aria-label="Նվազագույն գին" />
          <input type="range" min={0} max={100000} step={1000} value={activeFilters.maxPrice ?? 100000}
            onChange={(e) => onFilterChange({ ...activeFilters, maxPrice: Number(e.target.value) < 100000 ? Number(e.target.value) : undefined })}
            className="absolute inset-0 w-full opacity-0 cursor-pointer" aria-label="Առավելագույն գին" />
        </div>
      </Section>
      }

      {/* Stock + Sale */}
      <Section title="Մնացորդ" k="stock" expanded={expanded} toggle={toggle}>
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input type="checkbox" className="rounded border-input accent-primary" checked={!!activeFilters.inStockOnly}
            onChange={(e) => onFilterChange({ ...activeFilters, inStockOnly: e.target.checked || undefined })} />
          Միայն առկա
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-sm mt-2">
          <input type="checkbox" className="rounded border-input accent-primary" checked={!!activeFilters.onSale}
            onChange={(e) => onFilterChange({ ...activeFilters, onSale: e.target.checked || undefined })} />
          Միայն զեղճված
        </label>
      </Section>

      {/* Rating */}
      <Section title="Գնահատական" k="rating" expanded={expanded} toggle={toggle}>
        <div className="flex flex-wrap gap-2">
          {[4, 3, 2, 1].map((r) => (
            <Badge key={r} variant={activeFilters.minRating === r ? 'default' : 'outline'}
              className="cursor-pointer text-xs transition-all hover:scale-105 px-3 py-1.5"
              onClick={() => onFilterChange({ ...activeFilters, minRating: activeFilters.minRating === r ? undefined : r })}>{r}★+</Badge>
          ))}
        </div>
      </Section>

      {/* Dynamic filters */}
      {filterDefs?.filter((def) => def.slug !== 'type').map((def) => (
        <Section key={def._id} title={def.name} k={def.slug} expanded={expanded} toggle={toggle}>
          {(def.type === 'select' || def.type === 'multiselect') && def.options && (
            <div className="flex flex-wrap gap-2">
              {def.options.map((opt) => {
                const isMulti = def.type === 'multiselect';
                const active = isMulti
                  ? ((activeFilters.attributes?.[def.slug] as string[]) || []).includes(opt)
                  : activeFilters.attributes?.[def.slug] === opt;
                return (
                  <Badge key={opt} variant={active ? 'default' : 'outline'}
                    className="cursor-pointer text-xs transition-all hover:scale-105 px-3 py-1.5"
                    onClick={() => isMulti ? toggleMulti(def.slug, opt) : updateAttr(def.slug, active ? null : opt)}
                  >{opt}</Badge>
                );
              })}
            </div>
          )}
          {def.type === 'boolean' && (
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" className="rounded border-input accent-primary"
                checked={!!(activeFilters.attributes?.[def.slug])}
                onChange={(e) => updateAttr(def.slug, e.target.checked || undefined)} />
              {def.name}
            </label>
          )}
          {def.type === 'range' && (
            <div className="flex gap-2 items-center">
              <Input type="number" placeholder="Նվազագույն" className="h-8 text-xs"
                onChange={(e) => updateAttr(def.slug, e.target.value ? Number(e.target.value) : null)} />
              {def.unit && <span className="text-xs text-muted-foreground">{def.unit}</span>}
            </div>
          )}
        </Section>
      ))}
    </div>
  );
}


function Section({ title, k, expanded, toggle, children }: {
  title: string; k: string; expanded: Set<string>; toggle: (k: string) => void; children: React.ReactNode;
}) {
  const isOpen = expanded.has(k);
  return (
    <div className="border-b border-border/50 pb-4 last:border-0">
      <button onClick={() => toggle(k)} className="flex w-full items-center justify-between py-1 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
        {title}
        {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      <div className={`grid transition-all duration-200 ${isOpen ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
