'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Clock, Flame, Percent, Gift, Zap } from 'lucide-react';
import Link from 'next/link';
import { useReveal, cardRevealStyle, useMouseGlow } from '@/lib/motion';
import { ProductCard } from '@/components/cards/ProductCard';
import { Loader } from '@/components/ui/loader';
import Image from 'next/image';

function CountdownBlock({ endDate }: { endDate: number }) {
  const [now] = useState(() => Date.now());
  const diff = Math.max(0, endDate - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="flex gap-3">
      {[{ v: days, l: 'Օր' }, { v: hours, l: 'ժ' }, { v: mins, l: 'ր' }].map((item) => (
        <div key={item.l} className="flex flex-col items-center rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
          <span className="text-2xl font-black">{item.v}</span>
          <span className="text-[10px] uppercase tracking-wider opacity-70">{item.l}</span>
        </div>
      ))}
    </div>
  );
}

function PromoCard({ promo, index }: { promo: { _id: string; title: string; description?: string; imageUrl?: string; discountPercent?: number; endDate: number; categoryIds?: string[]; productIds?: string[] }; index: number }) {
  return (
    <Link href={`/promotions/${promo._id}`} className="block">
      <div className="group overflow-hidden rounded-2xl border bg-background transition-all hover:shadow-xl hover:-translate-y-1">
        <div className="aspect-[2/1] bg-gradient-to-br from-primary/10 to-primary/5 relative overflow-hidden">
          {promo.imageUrl ? <Image src={promo.imageUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/20"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>}
          {promo.discountPercent && <Badge className="absolute left-4 top-4 bg-destructive text-lg px-3 py-1 font-black">-{promo.discountPercent}%</Badge>}
        </div>
        <div className="p-6">
          <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{promo.title}</h3>
          {promo.description && <p className="mt-2 text-muted-foreground">{promo.description}</p>}
        </div>
      </div>
    </Link>
  );
}

function PromoProducts({ promo }: { promo: { categoryIds?: string[]; productIds?: string[] } }) {
  const products = useQuery(api.products.list, { limit: 50 });
  // Only show products that are explicitly linked to this promotion
  if (!promo.productIds && !promo.categoryIds) return null;
  if (promo.productIds && promo.productIds.length === 0 && (!promo.categoryIds || promo.categoryIds.length === 0)) return null;
  
  const filtered = products?.filter((p) => {
    if (promo.productIds && promo.productIds.length > 0) return promo.productIds.includes(p._id);
    if (promo.categoryIds && promo.categoryIds.length > 0) return promo.categoryIds.includes(p.categoryId);
    return false;
  }).slice(0, 4);
  if (!filtered || filtered.length === 0) return null;
  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      {filtered.map((p, i) => (
        <ProductCard key={p._id} id={p._id} slug={p.slug} name={p.name} price={p.price} compareAtPrice={p.compareAtPrice} image={p.images?.[0]} inStock={p.stock > 0} index={i} />
      ))}
    </div>
  );
}

export default function PromotionsPage() {
  const promotions = useQuery(api.promotions.active, {});

  if (promotions === undefined) return <Loader />;

  const mainPromo = promotions[0];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-violet-700 text-white">
        {/* Decorations */}
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-2xl" />
        </div>

        <div className="relative mx-auto flex flex-col items-center text-center" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: '5rem' }}>
          <div className="hero-fade-1 mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 backdrop-blur-sm">
            <Flame className="h-5 w-5 text-orange-300" />
            <span className="text-sm font-semibold">Ակցիա</span>
          </div>

          <h1 className="hero-fade-2 text-4xl font-black tracking-tight md:text-6xl" style={{ lineHeight: 1.1 }}>
            Ակցիաներ<br />
          </h1>

          <p className="hero-fade-3 mt-6 max-w-xl text-lg text-white/80">
              Գտեք լավագույն առաջարկները և զեղչերը մեր հատուկ ակցիաների բաժնում: Միացեք մեզ և խնայեք ձեր ժամանակն ու գումարը:
          </p>

          {mainPromo && (
            <div className="hero-fade-4 mt-8">
              <CountdownBlock endDate={mainPromo.endDate} />
            </div>
          )}

          <div className="hero-fade-4 mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/products">
              <Button size="lg" className="gap-2 bg-white text-white hover:bg-white/90 font-bold">
                <Zap className="h-5 w-5" /> Ապրանքներ
              </Button>
            </Link>
          </div>

          {/* Trust badges */}
          <div className="hero-fade-4 mt-12 flex flex-wrap justify-center gap-6 text-sm text-white/60">
            <span className="flex items-center gap-2"><Gift className="h-4 w-4" /> Նվերներ</span>
            <span className="flex items-center gap-2"><Percent className="h-4 w-4" /> Ակցիա -50%</span>
            <span className="flex items-center gap-2"><Clock className="h-4 w-4" />Խնայում</span>
          </div>
        </div>
      </section>

      {/* Promo cards */}
      {promotions.length > 0 && (
        <section className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-section)' }}>
          <h2 className="mb-8 text-center text-2xl font-bold">Ակցիաներ</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {promotions.map((promo, i) => <PromoCard key={promo._id} promo={promo} index={i} />)}
          </div>
        </section>
      )}

      {promotions.length === 0 && (
        <section className="py-16 text-center">
          <p className="text-lg text-muted-foreground">Ակցիաներ չեն հայտնաբերվել</p>
        </section>
      )}
    </div>
  );
}
