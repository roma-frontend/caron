'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Truck, Shield, Clock, Star } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HOME, FEATURES } from '@/lib/constants';
import { ProductCard } from '@/components/cards/ProductCard';
import { RecentlyViewed } from '@/components/RecentlyViewed';
import { CategoryCard } from '@/components/cards/CategoryCard';
import { useReveal, useMouseGlow, revealStyle, cardRevealStyle } from '@/lib/motion';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { formatPrice } from '@/lib/formatters';

const FEATURE_ICONS = { delivery: Truck, warranty: Shield, support: Clock, quality: Star };



function FeatureItem({ feature, index }: { feature: typeof FEATURES[number]; index: number }) {
  const { ref, visible } = useReveal();
  const Icon = FEATURE_ICONS[feature.key as keyof typeof FEATURE_ICONS];

  return (
    <div ref={ref} style={revealStyle(visible, index * 0.1)} className="flex items-start" >
      <div style={{ gap: 'var(--space-4)', padding: 'var(--space-4)', display: 'flex', alignItems: 'flex-start' }}>
        <div className="flex shrink-0 items-center justify-center rounded-lg bg-primary/10" style={{ height: '3rem', width: '3rem' }}>
          <Icon className="text-primary" style={{ height: '1.5rem', width: '1.5rem' }} />
        </div>
        <div>
          <h3 className="font-semibold">{feature.title}</h3>
          <p className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>{feature.desc}</p>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const categories = useQuery(api.categories.list, {});
  const featured = useQuery(api.products.getFeatured, {});
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero with mesh gradient orbs */}
        <section className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden text-center" style={{ paddingInline: 'var(--space-container)' }}>
          {/* Animated orbs */}
          <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
            <div className="absolute left-[-10%] top-[-20%] h-[800px] w-[800px] rounded-full mesh-orb-1" style={{ background: 'radial-gradient(circle, var(--landing-orb-1) 0%, transparent 70%)', filter: 'blur(100px)' }} />
            <div className="absolute right-[-15%] top-[10%] h-[700px] w-[700px] rounded-full mesh-orb-2" style={{ background: 'radial-gradient(circle, var(--landing-orb-2) 0%, transparent 70%)', filter: 'blur(100px)' }} />
            <div className="absolute bottom-[-10%] left-[10%] h-[600px] w-[600px] rounded-full mesh-orb-3" style={{ background: 'radial-gradient(circle, var(--landing-orb-3) 0%, transparent 70%)', filter: 'blur(80px)' }} />
          </div>

          {/* Badge */}
          <div className="hero-fade-1 relative inline-flex items-center overflow-hidden rounded-full backdrop-blur-sm" style={{ gap: 'var(--space-3)', paddingInline: 'var(--space-6)', paddingBlock: 'var(--space-3)', border: '1px solid var(--landing-card-border)', background: 'var(--landing-card-bg)', marginBottom: 'var(--space-6)' }}>
            <div className="badge-shimmer absolute inset-0" aria-hidden="true" />
            <div className="pulse-dot rounded-full bg-primary" style={{ width: '0.5rem', height: '0.5rem' }} />
            <span className="relative font-bold uppercase tracking-widest text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>{HOME.heroBadge}</span>
          </div>

          {/* Title */}
          <h1 className="hero-fade-2 font-black tracking-tighter" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', lineHeight: 'var(--line-height-tight)', marginBottom: 'var(--space-6)' }}>
            Ձեր ավտոպահեստամասերի հարթակը <br /><span className="armenia-flag-text">Հայաստանում</span>
          </h1>

          {/* Subtitle */}
          <p className="hero-fade-3 mx-auto text-muted-foreground" style={{ fontSize: 'var(--text-lg)', maxWidth: '40rem', marginBottom: 'var(--space-8)', lineHeight: 'var(--line-height-relaxed)' }}>
            {HOME.heroDesc}
          </p>

          {/* CTA */}
          <div className="hero-fade-4 flex flex-col items-center sm:flex-row" style={{ gap: 'var(--space-4)' }}>
            <Link href="/products">
              <Button size="lg" style={{ gap: 'var(--space-2)' }}>
                {HOME.ctaCatalog} <ArrowRight style={{ height: '1rem', width: '1rem' }} />
              </Button>
            </Link>
            <Link href="/categories">
              <Button size="lg" variant="outline">{HOME.ctaCategories}</Button>
            </Link>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center md:flex" style={{ gap: 'var(--space-2)' }} aria-hidden="true">
            <span className="uppercase tracking-widest text-primary" style={{ fontSize: 'var(--text-xs)', opacity: 0.6 }}>↓</span>
            <div className="scroll-line" style={{ width: '1px', height: '3rem', background: 'linear-gradient(to bottom, var(--primary), transparent)', opacity: 0.7 }} />
          </div>
        </section>

        {/* Categories */}
        <section className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-section)' }}>
          <h2 className="text-center font-bold" style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-8)' }}>{HOME.categoriesTitle}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4" style={{ gap: 'var(--space-4)' }}>
            {(categories ?? []).map((cat, i) => <CategoryCard key={cat._id} id={cat._id} name={cat.name} slug={cat.slug} description={cat.description} index={i} />)}
          </div>
        </section>

        {/* Featured Products */}
        {featured && featured.length > 0 && (
          <section className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-section)' }}>
            <h2 className="text-center font-bold" style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-8)' }}>Առաջարկվող ապրանքներ</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4" style={{ gap: 'var(--space-4)' }}>
              {featured.map((p, i) => (
                <ProductCard key={p._id} id={p._id} slug={p.slug} name={p.name} price={p.price} compareAtPrice={p.compareAtPrice} image={p.images?.[0]} inStock={p.stock > 0} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Features */}
        <section className="bg-muted/30" style={{ paddingBlock: 'var(--space-section)' }}>
          <div className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" style={{ gap: 'var(--space-6)' }}>
              {FEATURES.map((f, i) => <FeatureItem key={f.key} feature={f} index={i} />)}
            </div>
          </div>
        </section>
      </main>
      <RecentlyViewed />
      <Footer />
    </div>
  );
}
