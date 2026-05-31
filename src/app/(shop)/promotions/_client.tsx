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
        <div key={item.l} className="flex flex-col items-center rounded-xl border bg-card px-4 py-3">
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
      <div className="group relative overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5">
          {promo.imageUrl ? (
            <>
              <Image src={promo.imageUrl} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <Percent className="h-16 w-16 text-primary/15" strokeWidth={1} />
            </div>
          )}

          {/* Discount badge */}
          {promo.discountPercent && (
            <div className="absolute left-4 top-4 rounded-xl bg-destructive px-3 py-1.5 text-sm font-black text-white shadow-lg">
              -{promo.discountPercent}%
            </div>
          )}
        </div>

          {/* Text below image */}
        <div className="p-4">
          <h3 className="text-base font-bold group-hover:text-primary transition-colors leading-tight">{promo.title}</h3>
          {promo.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{promo.description}</p>}
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
            <span>Մանրամասներ</span>
          </div>
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
        <ProductCard key={p._id} id={p._id} slug={p.slug} name={p.name} price={p.price} compareAtPrice={p.compareAtPrice} image={p.images?.[0]} inStock={p.stock > 0} rating={p.rating} reviewCount={p.reviewCount} carBrand={p.attributes?.carBrand} index={i} />
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
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-muted/40 to-background">
        {/* Decorations */}
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="relative mx-auto flex flex-col items-center text-center" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: '5rem' }}>
          <div className="hero-fade-1 mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-5 py-2">
            <Flame className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold">Ակցիա</span>
          </div>

          <h1 className="hero-fade-2 text-4xl font-black tracking-tight md:text-6xl" style={{ lineHeight: 1.1 }}>
            Ակցիաներ
          </h1>

          <p className="hero-fade-3 mt-6 max-w-xl text-lg text-muted-foreground">
              Գտեք լավագույն առաջարկները և զեղչերը մեր հատուկ ակցիաների բաժնում: Միացեք մեզ և խնայեք ձեր ժամանակն ու գումարը:
          </p>

          {mainPromo && (
            <div className="hero-fade-4 mt-8">
              <CountdownBlock endDate={mainPromo.endDate} />
            </div>
          )}

          <div className="hero-fade-4 mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/products">
              <Button size="lg" className="gap-2">
                <Zap className="h-5 w-5" /> Ապրանքներ
              </Button>
            </Link>
          </div>

          {/* Trust badges */}
          <div className="hero-fade-4 mt-12 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><Gift className="h-4 w-4 text-primary" /> Նվերներ</span>
            <span className="flex items-center gap-2"><Percent className="h-4 w-4 text-primary" /> Ակցիա -50%</span>
            <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />Խնայում</span>
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
