'use client';

import { useFavoritesStore } from '@/store/favorites';
import { useCartStore } from '@/store/cart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, ShoppingCart, TrendingDown, Trash2 } from 'lucide-react';
import { formatPrice } from '@/lib/formatters';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';

export default function FavoritesPage() {
  const items = useFavoritesStore((s) => s.items);
  const toggle = useFavoritesStore((s) => s.toggle);
  const getPriceDrop = useFavoritesStore((s) => s.getPriceDrop);
  const addToCart = useCartStore((s) => s.addItem);

  if (items.length === 0) {
    return (
      <div className="mx-auto text-center" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-16)' }}>
        <div className="flex flex-col items-center" style={{ gap: 'var(--space-4)' }}>
          <div className="flex items-center justify-center rounded-full bg-muted" style={{ height: '6rem', width: '6rem' }}>
            <Heart className="text-muted-foreground" style={{ height: '3rem', width: '3rem' }} />
          </div>
          <h1 className="font-bold" style={{ fontSize: 'var(--text-2xl)' }}>Ընտրված</h1>
          <p className="text-muted-foreground">Ձեր ընտրված ապրանքները դատարկ են</p>
          <Link href="/products"><Button size="lg">Դիտել ապրանքները</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-8)' }}>
      <h1 className="font-bold" style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-8)' }}>Ընտրված ({items.length})</h1>
      <div className="grid" style={{ gap: 'var(--space-4)', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {items.map((item) => {
          const drop = getPriceDrop(item.id);
          return (
            <Card key={item.id} className="group overflow-hidden">
              <CardContent className="p-0">
                <div className="relative aspect-square bg-muted/50">
                  {item.image ? (
                    <Image src={item.image} alt={item.name} width={400} height={400} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl text-muted-foreground/30">🔧</div>
                  )}
                  {drop && (
                    <Badge className="absolute left-2 top-2 gap-1 bg-green-600 text-white text-xs font-bold shadow-lg animate-in slide-in-from-left-2">
                      <TrendingDown className="h-3 w-3" /> -{formatPrice(drop)}
                    </Badge>
                  )}
                  <button onClick={() => { toggle(item); toast.success('Հեռացվել է ընտրվածներից'); }} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-red-500 shadow-sm transition-transform hover:scale-110">
                    <Heart className="h-4 w-4 fill-current" />
                  </button>
                </div>
                <div style={{ padding: 'var(--space-4)' }}>
                  <h3 className="font-medium truncate" style={{ fontSize: 'var(--text-sm)' }}>{item.name}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-primary">{formatPrice(item.price)}</span>
                    {drop && <span className="text-xs text-muted-foreground line-through">{formatPrice(item.priceAtAdd!)}</span>}
                  </div>
                </div>
              </CardContent>
              <CardFooter style={{ padding: 'var(--space-4)', paddingTop: 0 }}>
                <Button size="sm" className="w-full gap-2" onClick={() => { addToCart({ id: item.id, name: item.name, price: item.price, image: item.image }); toast.success('Հեռացվել է ընտրվածներից'); }}>
                  <ShoppingCart className="h-4 w-4" /> Ավելացնել զամբյուղ
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
