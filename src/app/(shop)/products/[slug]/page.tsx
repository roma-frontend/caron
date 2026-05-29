'use client';

import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { ProductCard } from '@/components/cards/ProductCard';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Heart, ArrowLeft, Check, Truck, Shield } from 'lucide-react';
import { formatPrice, discountPercent } from '@/lib/formatters';
import { useCartStore } from '@/store/cart';
import { useFavoritesStore } from '@/store/favorites';
import { Loader } from '@/components/ui/loader';
import { useRecentlyViewedStore } from '@/store/recentlyViewed';
import { RecentlyViewed } from '@/components/RecentlyViewed';
import { ProductReviews } from '@/components/ProductReviews';
import { PRODUCT } from '@/lib/constants';
import Link from 'next/link';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { QuickBuyButton } from '@/components/QuickBuy';
import { useCompareStore } from '@/store/compare';
import { GitCompareArrows } from 'lucide-react';
import Image from 'next/image';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const product = useQuery(api.products.getBySlug, { slug: slug as string });
  const [selectedImg, setSelectedImg] = useState(0);
  const addViewed = useRecentlyViewedStore((s) => s.add);
  const productId = product?._id;
  useEffect(() => { if (product) addViewed({ id: product._id, slug: product.slug, name: product.name, price: product.price, image: product.images?.[0] ?? null }); }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps
  const [qty, setQty] = useState(1);
  const addItem = useCartStore((s) => s.addItem);
  const { add: addCompare, isInCompare } = useCompareStore();
  const inCompare = isInCompare(product?._id ?? '');
  const toggleFav = useFavoritesStore((s) => s.toggle);
  const isFav = useFavoritesStore((s) => s.isFavorite)(product?._id ?? '');

  if (product === undefined) return <Loader />;
  if (product === null) return (
    <div className="py-20 text-center">
      <p className="text-lg text-muted-foreground">{'Ապրանքը չի գտնվել'}</p>
      <Link href="/products"><Button variant="outline" className="mt-4 gap-2"><ArrowLeft className="h-4 w-4" /> {'Որոնել ապրանքներ'}</Button></Link>
    </div>
  );

  const attrs = (product.attributes ?? {}) as Record<string, string | boolean>;

  return (
    <div className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-8)' }}>
      <Breadcrumbs items={[{ label: 'Ապրանքներ', href: '/products' }, { label: product.name }]} />

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="aspect-square overflow-hidden rounded-2xl border bg-muted/30">
            {product.images?.[selectedImg] ? (
              <Image src={product.images[selectedImg]} alt={product.name} fetchPriority="high" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl text-muted-foreground/20 p-4 text-center"><div className="flex flex-col items-center gap-3"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/20"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div></div>
            )}
          </div>
          {product.images && product.images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {product.images.map((img, i) => (
                <button key={i} onClick={() => setSelectedImg(i)}
                  className={`h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${i === selectedImg ? 'border-primary' : 'border-transparent hover:border-muted-foreground/30'}`}>
                  <Image src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{product.name}</h1>

          {product.sku && <p className="mt-1 text-sm text-muted-foreground">SKU: {product.sku}</p>}

          <div className="mt-4 flex items-center gap-3">
            <span className="text-2xl sm:text-3xl font-bold text-primary">{formatPrice(product.price)}</span>
            {product.compareAtPrice && (
              <>
                <span className="text-lg text-muted-foreground line-through">{formatPrice(product.compareAtPrice)}</span>
                <Badge className="bg-destructive">-{discountPercent(product.price, product.compareAtPrice)}%</Badge>
              </>
            )}
          </div>

          <div className="mt-3">
            {product.stock > 0 && product.stock <= 10 ? (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-orange-600"><Check className="h-4 w-4" /> Միայն {product.stock} հատ պահեստում</span>
            ) : product.stock > 0 ? (
              <span className="inline-flex items-center gap-1 text-sm text-green-600"><Check className="h-4 w-4" /> {'Ապրանքը պահեստում է'}</span>
            ) : (
              <span className="text-sm text-destructive">{PRODUCT.outOfStock}</span>
            )}
          </div>

          <Separator className="my-5" />

          <p className="text-muted-foreground leading-relaxed">{product.description}</p>

          {/* Attributes */}
          {Object.keys(attrs).length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 font-semibold">{'Ատրիբուտներ'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(attrs).map(([key, val]) => (
                  <div key={key} className="flex justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{key}</span>
                    <span className="font-medium">{typeof val === 'boolean' ? (val ? 'Այո' : 'Ոչ') : String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator className="my-5" />

          {/* Quantity */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{'Քանակ'}</span>
            <div className="flex items-center rounded-lg border">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="flex h-10 w-10 items-center justify-center text-lg hover:bg-muted transition-colors rounded-l-lg">-</button>
              <span className="flex h-10 w-12 items-center justify-center font-semibold border-x">{qty}</span>
              <button onClick={() => setQty(Math.min(product.stock, qty + 1))} className="flex h-10 w-10 items-center justify-center text-lg hover:bg-muted transition-colors rounded-r-lg">+</button>
            </div>
          </div>

          <div className="h-3" />

          {/* Actions */}
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Button size="lg" className="w-full sm:w-auto sm:flex-1 gap-2" disabled={product.stock <= 0}
              onClick={() => { for (let i = 0; i < qty; i++) addItem({ id: product._id, name: product.name, price: product.price, image: product.images?.[0] ?? null }); toast.success(`${product.name} ավելացվել է զամբյուղում`); }}>
              <ShoppingCart className="h-5 w-5" /> {PRODUCT.addToCart}
            </Button>
            <Button size="lg" variant="outline"
              className={isFav ? 'text-red-500 border-red-200' : ''}
              onClick={() => toggleFav({ id: product._id, name: product.name, price: product.price, image: product.images?.[0] ?? null })}>
              <Heart className={`h-5 w-5 ${isFav ? 'fill-current' : ''}`} />
            </Button>
            <Button variant="outline" size="lg" className={`gap-2 w-full sm:w-auto ${inCompare ? 'border-primary text-primary' : ''}`}
              onClick={() => { if (!inCompare) { addCompare({ id: product._id, slug: product.slug, name: product.name, price: product.price, image: product.images?.[0] ?? null, attributes: (product.attributes ?? {}) as Record<string, string> }); toast.success('Ավելացվեց համեմատման'); } }}>
              <GitCompareArrows className="h-5 w-5" /> {inCompare ? 'Համեմատման մեջ' : 'Համեմատել'}
            </Button>
            <QuickBuyButton productId={product._id} productName={product.name} productPrice={product.price} productImage={product.images?.[0]} />
          </div>

          {/* Trust */}
          <div className="mt-6 flex flex-wrap gap-3 sm:gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Truck className="h-4 w-4" /> {'Առաքման վճար'}</span>
            <span className="flex items-center gap-1"><Shield className="h-4 w-4" /> {'Անվտանգ գնումներ'}</span>
          </div>
        </div>
      </div>
      <ProductReviews productId={product._id} />

      <RecentlyViewed />

      {/* Related Products */}
      <div className="mt-12">
        <h2 className="mb-6 text-xl font-bold">{'Նմանատիպ ապրանքներ'}</h2>
        <RelatedProducts categoryId={product.categoryId} currentId={product._id} />
      </div>
    </div>
  );
}

function RelatedProducts({ categoryId, currentId }: { categoryId: string; currentId: string }) {
  const products = useQuery(api.products.list, { categoryId: categoryId as Id<'categories'>, limit: 4 });
  const filtered = products?.filter((p) => p._id !== currentId).slice(0, 4);
  if (!filtered || filtered.length === 0) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {filtered.map((p, i) => (
        <ProductCard key={p._id} id={p._id} slug={p.slug} name={p.name} price={p.price} compareAtPrice={p.compareAtPrice} image={p.images?.[0]} inStock={p.stock > 0} index={i} />
      ))}
    </div>
  );
}
