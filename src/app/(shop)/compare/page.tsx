'use client';

import { useCompareStore } from '@/store/compare';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, GitCompareArrows, ShoppingCart } from 'lucide-react';
import { formatPrice } from '@/lib/formatters';
import { useCartStore } from '@/store/cart';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';

export default function ComparePage() {
  const { items, remove, clear } = useCompareStore();
  const addToCart = useCartStore((s) => s.addItem);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center" style={{ paddingInline: 'var(--space-container)' }}>
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
          <GitCompareArrows className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">{'Համեմատություն'}</h1>
        <p className="mt-2 text-muted-foreground">{'Ընտրեք ապրանքներ համեմատության համար'}</p>
        <Link href="/products"><Button className="mt-6">{'Ապրանքներ'}</Button></Link>
      </div>
    );
  }

  // Collect all unique attribute keys
  const allKeys = [...new Set(items.flatMap((i) => Object.keys(i.attributes)))];

  return (
    <div className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-8)' }}>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">{'Համեմատություն'}</h1>
        <Button variant="outline" size="sm" onClick={clear}>{'Մաքրել'}</Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-3 text-left text-sm font-medium text-muted-foreground w-40"></th>
              {items.map((item) => (
                <th key={item.id} className="p-3 text-center min-w-[200px]">
                  <div className="relative">
                    <button onClick={() => remove(item.id)} className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white text-xs">
                      <X className="h-3 w-3" />
                    </button>
                    <Link href={`/products/${item.slug}`}>
                      <div className="mx-auto mb-3 h-32 w-32 overflow-hidden rounded-xl bg-muted">
                        {item.image ? <Image src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-3xl">{'Համեմատություն'}</div>}
                      </div>
                      <p className="text-sm font-semibold hover:text-primary transition-colors">{item.name}</p>
                    </Link>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Price row */}
            <tr className="border-t">
              <td className="p-3 text-sm font-medium">{'Գին'}</td>
              {items.map((item) => (
                <td key={item.id} className="p-3 text-center text-lg font-bold text-primary">{formatPrice(item.price)}</td>
              ))}
            </tr>
            {/* Attribute rows */}
            {allKeys.map((key) => (
              <tr key={key} className="border-t">
                <td className="p-3 text-sm font-medium text-muted-foreground">{key}</td>
                {items.map((item) => (
                  <td key={item.id} className="p-3 text-center text-sm">{item.attributes[key] || 'Նախատեսված'}</td>
                ))}
              </tr>
            ))}
            {/* Add to cart row */}
            <tr className="border-t">
              <td className="p-3"></td>
              {items.map((item) => (
                <td key={item.id} className="p-3 text-center">
                  <Button size="sm" className="gap-1.5" onClick={() => { addToCart({ id: item.id, name: item.name, price: item.price, image: item.image }); toast.success('Ապրանքն ավելացվեց զամբյուղի մեջ'); }}>
                    <ShoppingCart className="h-3.5 w-3.5" /> {'Ավելացնել զամբյուղ'}
                  </Button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
