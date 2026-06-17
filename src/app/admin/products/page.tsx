'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

function AdminProductCard({ product, sessionToken, index }: { product: { _id: Id<'products'>; name: string; price: number; costPrice?: number; stock: number; sku?: string; images?: string[]; isActive: boolean; isFeatured?: boolean }; sessionToken: string; index: number }) {
  const { ref, visible } = useReveal();
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
        <div className="relative aspect-4/3 overflow-hidden bg-gradient-to-br from-muted/50 to-muted/30">
          {product.images?.[0] ? (
            <Image src={product.images[0]} alt={product.name} width={400} height={400} sizes="(max-width: 640px) 50vw, 240px" className="h-full w-full object-fill transition-transform duration-500 group-hover:scale-110" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/20"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            </div>
          )}
          <div className="absolute right-2 top-2 flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
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
            <span className="shrink-0 text-md font-bold text-primary">{formatPrice(product.price)}</span>
            {product.costPrice != null && <span className="text-xs text-muted-foreground">{'Ինքնարժեք'}: {formatPrice(product.costPrice)}</span>}
          </div>
          <div className="mt-3 flex flex-col justify-between gap-2">
            <span className="text-xs text-muted-foreground">Պահեստ: {product.stock}</span>
            <Badge variant={product.stock > 0 ? 'default' : 'destructive'} className="text-[10px]">
              {product.stock > 0 ? 'Պահեստում է' : 'Անհասանելի'}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminProductListRow({ product, sessionToken, index }: { product: { _id: Id<'products'>; name: string; price: number; costPrice?: number; stock: number; sku?: string; images?: string[]; isActive: boolean; isFeatured?: boolean }; sessionToken: string; index: number }) {
  const { ref, visible } = useReveal();
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
    <div ref={ref} style={revealStyle(visible, index * 0.03)} className="rounded-2xl border bg-card p-3 shadow-card">
      <div className="flex items-center gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted/30">
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
            <span className="text-sm font-bold text-primary">{formatPrice(product.price)}</span>
            {product.costPrice != null && <span className="text-xs text-muted-foreground">{formatPrice(product.costPrice)}</span>}
            <Badge variant={product.stock > 0 ? 'default' : 'destructive'} className="text-[10px]">
              {product.stock > 0 ? `Պահեստ: ${product.stock}` : 'Անհասանելի'}
            </Badge>
            {!product.isActive && <Badge variant="secondary" className="text-[10px]">Ակտիվ չէ</Badge>}
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
  const searchTerm = search.trim().toLowerCase();

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
          {visibleProducts?.map((p, i) => <AdminProductListRow key={p._id} product={p} sessionToken={sessionToken ?? ''} index={i} />)}
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


