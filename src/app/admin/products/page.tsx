'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit, Package, Search } from 'lucide-react';
import { formatPrice } from '@/lib/formatters';
import { toast } from 'sonner';
import { Id } from '../../../../convex/_generated/dataModel';
import Link from 'next/link';
import { useReveal, revealStyle } from '@/lib/motion';
import Image from 'next/image';
import { useAuth } from '@/store/auth';

function AdminProductCard({ product, sessionToken, index }: { product: { _id: Id<'products'>; name: string; price: number; stock: number; sku?: string; images?: string[]; isActive: boolean; isFeatured?: boolean }; sessionToken: string; index: number }) {
  const { ref, visible } = useReveal();
  const remove = useMutation(api.products.remove);

  const handleDelete = async () => {
    if (!confirm(`Ջնջել "${product.name}"?`)) return;
    await remove({ sessionToken, id: product._id });
    toast.success('Ապրանքը ջնջվել է');
  };

  return (
    <div ref={ref} style={revealStyle(visible, index * 0.05)}>
      <div className="group relative overflow-hidden rounded-2xl border bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-muted/50 to-muted/30">
          {product.images?.[0] ? (
            <Image src={product.images[0]} alt={product.name} width={400} height={400} sizes="(max-width: 640px) 50vw, 240px" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/20"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            </div>
          )}
          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Link href={`/admin/products/${product._id}/edit`}>
              <Button size="icon-sm" variant="secondary" className="h-8 w-8 shadow-md"><Edit className="h-3.5 w-3.5" /></Button>
            </Link>
            <Button size="icon-sm" variant="destructive" className="h-8 w-8 shadow-md" onClick={handleDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
          {!product.isActive && <Badge className="absolute left-2 top-2" variant="secondary">Ակտիվ</Badge>}
          {product.isFeatured && <Badge className="absolute left-2 bottom-2 bg-primary">★</Badge>}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold">{product.name}</h3>
              <p className="text-xs text-muted-foreground">{product.sku ?? '—'}</p>
            </div>
            <span className="shrink-0 text-lg font-bold text-primary">{formatPrice(product.price)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
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

export default function AdminProductsPage() {
  const { sessionToken } = useAuth();
  const products = useQuery(api.products.list, {});
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const categories = useQuery(api.categories.list, {});

  let filtered = products?.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))) return false;
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

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold">Ապրանքներ</h1>
          <p className="text-muted-foreground">{products?.length ?? 0} ապրանք</p>
        </div>
        <Link href="/admin/products/add">
          <Button className="gap-2"><Plus className="h-4 w-4" /> Ավելացնել ապրանք</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Որոնել..." className="h-9 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={catFilter} onValueChange={(v) => setCatFilter(v ?? 'all')}>
          <SelectTrigger className="h-9 w-40"><SelectValue>{catFilter === "all" ? "Բոլոր" : categories?.find(c => c._id === catFilter)?.name ?? "Կատեգորիա"}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Բոլոր</SelectItem>
            {categories?.map((cat) => <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={(v) => setStockFilter(v ?? 'all')}>
          <SelectTrigger className="h-9 w-36"><SelectValue>{{ all: "Պահեստ", instock: "Առկա", low: "Ցածր (≤5)", out: "Սպառվել" }[stockFilter]}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Պահեստ</SelectItem>
            <SelectItem value="instock">Առկա</SelectItem>
            <SelectItem value="low">Ցածր (≤5)</SelectItem>
            <SelectItem value="out">Սպառվել</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="h-9 w-36"><SelectValue>{{ all: "Կարգավիճակ", active: "Ակտիվ", inactive: "Անակտիվ", featured: "Առաջարկված" }[statusFilter]}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Կարգավիճակ</SelectItem>
            <SelectItem value="active">Ակտիվ</SelectItem>
            <SelectItem value="inactive">Անակտիվ</SelectItem>
            <SelectItem value="featured">Առաջարկված</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v ?? 'newest')}>
          <SelectTrigger className="h-9 w-36"><SelectValue>{{ newest: "Նորագույն", name: "Անուն", priceAsc: "Գին ↑", priceDesc: "Գին ↓", stockAsc: "Պահեստ ↑" }[sortBy]}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Նորագույն</SelectItem>
            <SelectItem value="name">Անուն</SelectItem>
            <SelectItem value="priceAsc">Գին ↑</SelectItem>
            <SelectItem value="priceDesc">Գին ↓</SelectItem>
            <SelectItem value="stockAsc">Պահեստ ↑</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{filtered?.length ?? 0} ապրանք</p>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        {filtered?.map((p, i) => <AdminProductCard key={p._id} product={p} sessionToken={sessionToken ?? ''} index={i} />)}
      </div>

      {filtered?.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Package className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground">Ապրանքներ չեն գտնվել</p>
          <Link href="/admin/products/add"><Button>Ավելացնել ապրանք</Button></Link>
        </div>
      )}
    </div>
  );
}
