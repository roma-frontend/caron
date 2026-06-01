'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Truck, Shield, Clock, Star } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HOME, FEATURES } from '@/lib/constants';
import { ProductCard } from '@/components/cards/ProductCard';
import { RecentlyViewed } from '@/components/RecentlyViewed';
import { CategoryCard } from '@/components/cards/CategoryCard';
import { VehicleSelector } from '@/components/VehicleSelector';
import { useReveal, revealStyle } from '@/lib/motion';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { formatPrice } from '@/lib/formatters';
import { useSettings } from '@/hooks/useSettings';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

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
  const allProds = useQuery(api.products.list, { limit: 500 });
  const brands = allProds ? [...new Set(allProds.filter((p) => p.brand).map((p) => p.brand as string))].sort() : undefined;
  const settings = useSettings();
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero with mesh gradient orbs */}
        <section className="relative flex min-h-[70vh] sm:min-h-[80vh] flex-col items-center justify-center overflow-hidden text-center" style={{ paddingInline: 'max(var(--space-container), 0.75rem)' }}>
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
          <h1 className="hero-fade-2 font-black tracking-tighter" style={{ fontSize: 'clamp(2rem, 6vw, 4.5rem)', lineHeight: 'var(--line-height-tight)', marginBottom: 'var(--space-6)', overflowWrap: 'break-word' }}>
            {HOME.heroTitle}
          </h1>

          {/* Subtitle */}
          <p className="hero-fade-3 mx-auto text-muted-foreground" style={{ fontSize: 'var(--text-lg)', maxWidth: '40rem', marginBottom: 'var(--space-8)', lineHeight: 'var(--line-height-relaxed)' }}>
            {HOME.heroDesc}
          </p>

          {/* Vehicle selector — signature auto-parts fitment pattern */}
          {settings?.enableCarSelector !== false && (
            <div className="hero-fade-4 w-full" style={{ maxWidth: '46rem', marginBottom: 'var(--space-6)' }}>
              <VehicleSelector />
            </div>
          )}

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

          {/* Mini product grid in hero */}
          {featured && featured.length > 0 && (
            <div className="hero-fade-4 mt-10 w-full max-w-4xl mx-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {featured.slice(0, 4).map((p, i) => (
                  <Link key={p._id} href={`/products/${p.slug}`} className="group relative overflow-hidden rounded-xl border bg-card/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg" style={{ aspectRatio: '3/4' }}>
                    {p.images?.[0] ? (
                      <Image src={p.images[0]} alt={p.name} width={200} height={200} priority sizes="(max-width: 640px) 50vw, 200px" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground/30">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-0 bg-gradient-to-t from-black to-black/40 transition-all duration-300 group-hover:h-full" />
                    <div className="absolute inset-x-0 bottom-0 translate-y-4 p-4 text-center opacity-100 transition-all duration-300 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100">
                      <p className="text-xs font-semibold text-white line-clamp-2 drop-shadow-lg">{p.name}</p>
                      <p className="mt-1 text-sm font-bold text-white drop-shadow-lg">{formatPrice(p.price)}</p>
                    </div>
                    {p.isFeatured && <Badge className="absolute left-2 top-2 px-2 py-0.5 text-[10px] font-bold group-hover:bg-white group-hover:text-black" variant="destructive">Թոփ</Badge>}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Trust bar */}
          <div className="hero-fade-4 flex flex-wrap items-center justify-center" style={{ gap: 'var(--space-3) var(--space-6)', marginTop: 'var(--space-6)' }}>
            {[
              { Icon: Truck, label: 'Արագ առաքում ողջ ՀՀ-ում' },
              { Icon: Shield, label: 'Երաշխիք ապրանքների վրա' },
              { Icon: Clock, label: '24/7 աջակցություն' },
              { Icon: Star, label: 'Բնօրինակ որակ' },
            ].map(({ Icon, label }) => (
              <span key={label} className="flex items-center gap-2 text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>
                <Icon className="h-4 w-4 text-primary" /> {label}
              </span>
            ))}
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center md:flex" style={{ gap: 'var(--space-2)' }} aria-hidden="true">
            <span className="uppercase tracking-widest text-primary" style={{ fontSize: 'var(--text-xs)', opacity: 0.6 }}>↓</span>
            <div className="scroll-line" style={{ width: '1px', height: '3rem', background: 'linear-gradient(to bottom, var(--primary), transparent)', opacity: 0.7 }} />
          </div>
        </section>

        {/* Categories */}
        {settings?.showCategories !== false && (
        <section className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-section)' }}>
          <h2 className="text-center font-bold" style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-8)' }}>{HOME.categoriesTitle}</h2>
          <div className="flex flex-wrap" style={{ gap: 'var(--space-4)' }}>
            {categories === undefined
              ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="animate-pulse rounded-xl bg-muted flex-1 basis-[250px]" style={{ height: '8rem' }} />)
              : categories.map((cat, i) => <CategoryCard key={cat._id} id={cat._id} name={cat.name} slug={cat.slug} description={cat.description} index={i} className="flex-1 basis-[250px]" />)}
          </div>
        </section>
        )}

        {/* Brands */}
        {settings?.showBrands !== false && (
        <section className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-section)' }}>
          <h2 className="text-center font-bold" style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-8)' }}>Բրենդներ</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {brands?.slice(0, 8).map((b) => (
              <Link key={b} href={`/products?brand=${encodeURIComponent(b)}`}
                className="flex items-center gap-2 rounded-xl border bg-card px-5 py-3 text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30">
                {b}
              </Link>
            ))}
            {brands && brands.length > 8 && (
              <Link href="/products?brand=all"
                className="flex items-center gap-2 rounded-xl border bg-primary/5 px-5 py-3 text-sm font-semibold text-primary transition-all hover:-translate-y-0.5 hover:shadow-md hover:bg-primary/10">
                Դիտել Բոլորը <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </section>
        )}

        {/* Featured Products — с хитовыми товарами в hero-стиле */}
        {settings?.showFeatured !== false && (featured === undefined || featured.length > 0) && (
          <section className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-section)' }}>
            <div className="flex flex-col items-start sm:items-center justify-between mb-8 gap-2">
              <h2 className="text-center font-bold" style={{ fontSize: 'var(--text-2xl)' }}>Թոփ վաճառք</h2>
              <Link href="/products">
                <Button variant="ghost" className="gap-1 text-sm">
                  Բոլոր ապրանքները <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {featured === undefined
                ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="animate-pulse rounded-xl bg-muted" style={{ height: '16rem' }} />)
                : featured.slice(0, 4).map((p, i) => (
                    <ProductCard key={p._id} id={p._id} slug={p.slug} name={p.name} price={p.price} compareAtPrice={p.compareAtPrice} image={p.images?.[0]} inStock={p.stock > 0} rating={p.rating} reviewCount={p.reviewCount} carBrand={p.attributes?.carBrand} attributes={p.attributes} index={i} isHit={p.isFeatured} />
                  ))}
            </div>
            <div className="mt-8 flex justify-center">
              <Link href="/products"><Button size="lg" variant="outline" className="gap-2">Դիտել բոլորը <ArrowRight style={{ height: '1rem', width: '1rem' }} /></Button></Link>
            </div>
          </section>
        )}

        {/* Features */}
        {settings?.showFeatures !== false && (
        <section className="bg-muted/30" style={{ paddingBlock: 'var(--space-section)' }}>
          <div className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" style={{ gap: 'var(--space-6)' }}>
              {FEATURES.map((f, i) => <FeatureItem key={f.key} feature={f} index={i} />)}
            </div>
          </div>
        </section>
        )}
      </main>
      <RecentlyViewed />
      <Footer />
    </div>
  );
}
