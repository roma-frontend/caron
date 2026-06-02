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

const BRAND_COLORS: Record<string, string> = {
  Mobil: '#0072C6', Castrol: '#005EB8', 'Liqui Moly': '#003D7A', Motul: '#005EB8',
  Shell: '#FFD500', Elf: '#E32636', Total: '#003E7E', Ravenol: '#003399',
  Idemitsu: '#D42027', Fuchs: '#003366', Petronas: '#00A3E0', LiquiMoly: '#003D7A',
  Sinopec: '#CC0000', Gazprom: '#1A5276', Valvoline: '#E31B23', Pennzoil: '#FFD700',
  Quaker: '#003366', Gulf: '#E31837', BP: '#006633', Aral: '#003399',
  ZIC: '#003399', Kixx: '#00529B', Hyundai: '#002C5F', Kia: '#BB162B',
  Mann: '#003D7A', 'Mann-Filter': '#003D7A', Mahle: '#005A8C', Knecht: '#003D7A',
  Hengst: '#003366', Purflux: '#E3001B', Sakura: '#CC0000', Nipparts: '#003399',
  Brembo: '#E30613', TRW: '#003366', ATE: '#CC0000', Ferodo: '#004080',
  Bosch: '#E60000', Textar: '#003366', Jurid: '#CC0000', Pagid: '#004080',
  Zimmerman: '#003399', Meyle: '#005BAA', Febest: '#009944',
  Michelin: '#FFD700', Bridgestone: '#E60012', Goodyear: '#000000',
  Pirelli: '#FFCC00', Continental: '#FFAA00', Hankook: '#004EA2',
  Yokohama: '#001F5B', Dunlop: '#005A8C', Toyo: '#E60012', Kumho: '#009944',
  Nokian: '#003366', Fulda: '#E60000', 'GT Radial': '#003399', Barum: '#0066B3',
  Lassa: '#007DB7', Sava: '#00843D', Firestone: '#E60000', Viking: '#003399',
  Dezent: '#CC0000', Rial: '#003366', AEZ: '#004080', Alcar: '#003399',
  NGK: '#00A65A', Hella: '#F5A623', Denso: '#E60000',
  Valeo: '#005EB8', Beru: '#CC0000', Magneti: '#003366', Marelli: '#003366',
  Lucas: '#003399', Facet: '#005BAA', SWAG: '#009944', Delphi: '#0055A5',
  Philips: '#005CB9', Osram: '#00A3E0',
  Varta: '#1A5C1A', Banner: '#004EA2', Exide: '#DA291C', Tudor: '#003399',
  Moll: '#003366', TAB: '#004080',
  Monroe: '#004080', Sachs: '#003366', Bilstein: '#005BAA', KYB: '#CC0000',
  Kayaba: '#CC0000', Lemforder: '#005A8C', Moog: '#E60000', Febi: '#009944',
  Swag: '#003399', CTR: '#005BAA', Optimal: '#003366',
  Gates: '#00529B', Contitech: '#003366', Dayco: '#E60012', INA: '#003399',
  SKF: '#003366', SNR: '#E30613', FAG: '#003399', NTN: '#DA291C',
  Champion: '#DA291C', Wahler: '#003366', Calorstat: '#CC0000',
  Metzger: '#003399', Topran: '#005BAA', Mapco: '#004080', Stark: '#003366',
  Maxgear: '#00529B', Patron: '#CC0000', Vaico: '#003399', JP: '#005BAA',
  'JP Group': '#005BAA', AJUSA: '#003366', Elring: '#CC0000', Victor: '#003399',
  Reinz: '#004080', Goetze: '#003366', Payen: '#CC0000',
};

function brandColor(name: string): string {
  const known = BRAND_COLORS[name];
  if (known) return known;
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const h = ((hash % 360) + 360) % 360;
  return `hsl(${h}, 55%, 45%)`;
}

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
                    <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-black/70 to-transparent md:h-0 md:transition-all md:duration-300 md:group-hover:h-full" />
                    <div className="absolute inset-x-0 bottom-0 p-4 text-center transition-all duration-300 md:translate-y-4 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100">
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

        {/* Brands — luxury showcase */}
        {settings?.showBrands !== false && (
        <section className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-section)' }}>
          <h2 className="text-center font-bold tracking-tight" style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-8)' }}>
            <span className="bg-gradient-to-r from-foreground/80 via-foreground to-foreground/80 bg-clip-text text-transparent">Բրենդեր</span>
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {brands?.slice(0, 8).map((b) => {
              const color = brandColor(b);
              return (
                <Link key={b} href={`/products?brand=${encodeURIComponent(b)}`}
                  className="group relative flex h-20 w-[190px] items-center justify-center rounded-2xl border border-transparent bg-gradient-to-br from-card to-muted/30 px-6 shadow-xs transition-all duration-500 hover:scale-[1.03] hover:shadow-xl overflow-hidden"
                  style={{ '--brand-color': color } as React.CSSProperties}>
                  {/* Shine overlay on hover */}
                  <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{ background: `linear-gradient(135deg, transparent 30%, ${color}15 50%, transparent 70%)` }} />
                  {/* Thin top accent line */}
                  <div className="absolute inset-x-4 top-0 h-0.5 rounded-full opacity-0 transition-all duration-500 group-hover:opacity-100"
                    style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
                  {/* Subtle glow */}
                  <div className="absolute -inset-1 rounded-3xl opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-30"
                    style={{ background: `radial-gradient(circle, ${color}20, transparent 70%)` }} />
                  {/* Brand initial — luxury monogram */}
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black tracking-widest shadow-inner"
                    style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: '#fff' }}>
                    {b.charAt(0)}
                  </div>
                  {/* Brand name — typographic logotype style */}
                  <div className="relative ml-3">
                    <p className="text-xl font-black leading-none tracking-[0.12em]" style={{ color, fontFamily: 'var(--font-playfair), Georgia, serif' }}>{b}</p>
                  </div>
                </Link>
              );
            })}
            {brands && brands.length > 8 && (
              <Link href="/products?brand=all"
                className="group flex h-20 w-[190px] items-center justify-center gap-2.5 rounded-2xl border border-dashed border-muted-foreground/20 bg-card/50 text-muted-foreground transition-all duration-500 hover:scale-[1.03] hover:border-primary/30 hover:text-primary hover:shadow-lg">
                <span className="text-2xl font-light leading-none transition-transform duration-500 group-hover:rotate-90">+</span>
                <span className="text-sm font-medium">Բոլոր բրենդերը</span>
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
      <RecentlyViewed />
      </main>
      <Footer />
    </div>
  );
}
