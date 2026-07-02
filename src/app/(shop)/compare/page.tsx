'use client';

import { useCompareStore } from '@/store/compare';
import { Button } from '@/components/ui/button';
import { X, GitCompareArrows, ShoppingCart, TrendingDown, Check } from 'lucide-react';
import { formatPrice } from '@/lib/formatters';
import { useCartStore } from '@/store/cart';
import Link from '@/components/LocalizedLink';
import Image from 'next/image';
import { motion } from '@/lib/motion';
import { useT } from '@/lib/i18n/admin';

export default function ComparePage() {
  const { t } = useT();
  const { items, remove, clear } = useCompareStore();
  const addToCart = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const bestPrice = items.length > 0 ? Math.min(...items.map((i) => i.price)) : 0;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center" style={{ paddingInline: 'var(--space-container)' }}>
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
          <GitCompareArrows className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">{t('sp.comparison')}</h1>
        <p className="mt-2 text-muted-foreground">{t('sp.selectProductsToCompare')}</p>
        <Link href="/products"><Button className="mt-6">{t('sp.products')}</Button></Link>
      </div>
    );
  }

  const allKeys = [...new Set(items.flatMap((i) => Object.keys(i.attributes)))];

  return (
    <div className="mx-auto max-w-[var(--container-max)] sm:px-[var(--space-container)] py-[var(--space-8)]">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">{t('sp.comparison')} <span className="text-lg font-normal text-muted-foreground">({items.length} {t('sp.productWord')})</span></h1>
        <Button variant="outline" size="sm" onClick={clear}>{t('sp.clear')}</Button>
      </div>

      <div className="overflow-x-auto pb-4 -mx-4 sm:-mx-0 px-4 sm:px-0">
        <motion.table className="w-auto border-collapse min-w-[500px] sm:min-w-0" layout>
          <thead>
            <tr>
              <th className="p-3 text-left text-sm font-medium text-muted-foreground w-40"></th>
              {items.map((item, idx) => (
                <th key={item.id} className="p-3 text-center min-w-[220px]">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="relative">
                    <button onClick={() => remove(item.id)} className="absolute -right-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white text-xs hover:scale-110 transition-transform">
                      <X className="h-3 w-3" />
                    </button>
                    {item.price === bestPrice && items.length > 1 && (
                      <span className="absolute -left-1 -top-1 z-10 flex items-center gap-1 rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-lg">
                        <TrendingDown className="h-3 w-3" /> {t('sp.bestPrice')}
                      </span>
                    )}
                    <Link href={`/products/${item.slug}`}>
                      <div className={`mx-auto mb-3 h-36 w-36 overflow-hidden rounded-xl bg-muted ring-1 transition-all duration-300 hover:ring-2 ${item.price === bestPrice && items.length > 1 ? 'ring-green-500/50' : 'ring-foreground/10'}`}>
                        {item.image ? <Image src={item.image} alt={item.name} width={300} height={300} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-3xl text-muted-foreground/30">?</div>}
                      </div>
                      <p className="text-sm font-semibold hover:text-primary transition-colors line-clamp-2">{item.name}</p>
                    </Link>
                  </motion.div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="p-3 text-sm font-medium text-muted-foreground">{t('sp.price')}</td>
              {items.map((item) => (
                <td key={item.id} className={`p-3 text-center text-lg font-bold ${item.price === bestPrice && items.length > 1 ? 'text-green-600' : 'text-primary'}`}>
                  <motion.span initial={{ scale: 1 }} animate={item.price === bestPrice ? { scale: [1, 1.1, 1] } : {}} transition={{ duration: 0.5 }}>
                    {formatPrice(item.price)}
                  </motion.span>
                  {item.price === bestPrice && items.length > 1 && (
                    <span className="ml-1.5 inline-flex"><Check className="h-4 w-4 text-green-600" /></span>
                  )}
                </td>
              ))}
            </tr>

            {/* Համատեղելիություն */}
            {allKeys.map((key) => {
              const values = items.map((i) => i.attributes[key] || '-');
              const isNumeric = values.every((v) => v !== '-' && !isNaN(Number(v)));
              const maxVal = isNumeric ? Math.max(...values.map(Number)) : null;
              return (
                <tr key={key} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-sm font-medium text-muted-foreground">{key}</td>
                  {items.map((item) => {
                    const val = item.attributes[key] || '-';
                    const numVal = isNumeric ? Number(val) : null;
                    return (
                      <td key={item.id} className="p-3 text-center">
                        <span className="text-sm">{val}</span>
                        {isNumeric && numVal !== null && maxVal !== null && (
                          <div className="mx-auto mt-1.5 h-1 w-full max-w-20 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(numVal / maxVal) * 100}%` }} />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            <tr className="border-t">
              <td className="p-3"></td>
              {items.map((item) => (
                <td key={item.id} className="p-3 text-center">
                  <Button size="sm" className="gap-1.5 rounded-xl w-full" onClick={() => { const prevQty = cartItems.find((i) => i.id === item.id)?.quantity ?? 0; addToCart({ id: item.id, name: item.name, price: item.price, image: item.image }); }}>
                    <ShoppingCart className="h-3.5 w-3.5" /> {t('sp.add')}
                  </Button>
                </td>
              ))}
            </tr>
          </tbody>
        </motion.table>
      </div>
    </div>
  );
}
