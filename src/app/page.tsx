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
import { useReveal, revealStyle, useMouseGlow } from '@/lib/motion';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { formatPrice } from '@/lib/formatters';
import { useSettings } from '@/hooks/useSettings';
import { useAuthStore } from '@/store/auth';
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

function brandTextColor(hexOrHsl: string): string {
  // For hsl(...) generated colors, lightness is always 45% → dark enough → white text
  if (hexOrHsl.startsWith('hsl')) return '#fff';
  // For hex colors, compute relative luminance
  const hex = hexOrHsl.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.45 ? '#111' : '#fff';
}

const FEATURE_ICONS = { delivery: Truck, warranty: Shield, support: Clock, quality: Star };

const HERO_VIDEO_SRC =
  process.env.NEXT_PUBLIC_HERO_VIDEO_URL ||
  'https://pub-21da6611c49e416480be7cc2d42af249.r2.dev/products/hero.mp4';



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
          <p className="text-white/70" style={{ fontSize: 'var(--text-sm)' }}>{feature.desc}</p>
        </div>
      </div>
    </div>
  );
}

type PriorityVideoProps = React.VideoHTMLAttributes<HTMLVideoElement> & {
  fetchPriority?: 'high' | 'low' | 'auto';
};

function PingPongVideo({ src, className }: { src: string; className?: string }) {
  const videoProps: PriorityVideoProps = {
    src,
    autoPlay: true,
    muted: true,
    loop: true,
    playsInline: true,
    preload: 'auto',
    width: 1920,
    height: 1080,
    fetchPriority: 'high',
    'aria-hidden': true,
  };

  return <video {...videoProps} className={className} />;
}

export default function HomePage() {
  const categories = useQuery(api.categories.list, {});
  const featured = useQuery(api.products.getFeatured, {});
  const brands = useQuery(api.products.getBrands, {});
  const discounted = useQuery(api.products.getRetailDiscounted, {});
  const wholesaleDiscounted = useQuery(api.products.getWholesaleDiscounted, {});
  const user = useAuthStore((s) => s.user);
  const isWholesale = user?.customerType === 'wholesale' && user?.role !== 'admin';
  const discountedSample = isWholesale ? wholesaleDiscounted?.slice(0, 4) : discounted?.slice(0, 4);
  const hasDiscounts = isWholesale ? (wholesaleDiscounted === undefined || wholesaleDiscounted.length > 0) : (discounted === undefined || discounted.length > 0);
  const settings = useSettings();
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex-1">
        {/* Hero — integrated section module */}
          <section className="relative min-h-[87svh] overflow-hidden lg:min-h-0 lg:px-[max(var(--space-container),0.75rem)] lg:pt-[var(--space-8)] lg:pb-[var(--space-10)]" data-hero>
          <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
            <div className="absolute left-[-6%] top-[-25%] h-[620px] w-[620px] rounded-full mesh-orb-1" style={{ background: 'radial-gradient(circle, var(--landing-orb-1) 0%, transparent 70%)', filter: 'blur(95px)' }} />
            <div className="absolute right-[-10%] top-[0%] h-[560px] w-[560px] rounded-full mesh-orb-2" style={{ background: 'radial-gradient(circle, var(--landing-orb-2) 0%, transparent 70%)', filter: 'blur(95px)' }} />
          </div>

          <div className="mx-auto lg:max-w-[var(--container-max)]">
            <div
              className="group relative overflow-hidden lg:rounded-[2rem] border-0 lg:border border-border/50 shadow-[0_20px_60px_rgba(0,0,0,0.18)] min-h-[87svh] lg:min-h-0 flex flex-col"
              onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty('--sx', `${e.clientX - r.left}px`);
                e.currentTarget.style.setProperty('--sy', `${e.clientY - r.top}px`);
              }}
            >
              <PingPongVideo src={HERO_VIDEO_SRC} className="absolute inset-0 h-full w-full object-cover hero-video" />
              {/* Blue tint overlay */}
              <div className="absolute inset-0 bg-blue-950/50 mix-blend-multiply" />
              {/* Dark overlay for readability */}
              <div className="absolute inset-0 bg-black/40" />
              {/* Vignette */}
              <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.65) 100%)' }} />
              {/* Spotlight — follows cursor */}
              <div className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                style={{ background: 'radial-gradient(400px circle at var(--sx, 50%) var(--sy, 50%), rgba(99,179,255,0.12), transparent 70%)' }} />
              <div className="pointer-events-none absolute inset-0 opacity-70" style={{ background: 'linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.03) 45%, transparent 100%)' }} />

              <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/20 px-6 py-4 sm:px-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" /> {HOME.heroBadge}
                </div>
              </div>

              <div className="relative z-10 flex flex-1 flex-col gap-7 px-6 py-8 sm:px-8 lg:flex-row lg:items-stretch lg:gap-10 lg:py-10 text-white justify-center">
                <div className="flex flex-1 flex-col justify-center">
                  <h1 className="hero-fade-2 text-balance font-black tracking-tighter text-white" style={{ fontSize: 'clamp(2rem, 5vw, 3.75rem)', lineHeight: 'var(--line-height-tight)', marginBottom: 'var(--space-6)', textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
                    {HOME.heroTitle}
                  </h1>

                  <p className="hero-fade-3 text-balance text-white/75" style={{ fontSize: 'var(--text-lg)', maxWidth: '36rem', marginBottom: 'var(--space-8)', lineHeight: 'var(--line-height-relaxed)' }}>
                    {HOME.heroDesc}
                  </p>

                  <div className="hero-fade-4 flex flex-col sm:flex-row" style={{ gap: 'var(--space-4)' }}>
                    <Link href="/products">
                      <Button size="lg" style={{ gap: 'var(--space-2)' }}>
                        {HOME.ctaCatalog} <ArrowRight style={{ height: '1rem', width: '1rem' }} />
                      </Button>
                    </Link>
                    <Link href="/categories">
                      <Button size="lg" variant="outline" className="border-white/50 bg-white/10 text-white hover:bg-white/20 hover:border-white/70 hover:text-white">{HOME.ctaCategories}</Button>
                    </Link>
                  </div>
                </div>

                {(settings === undefined || settings?.enableCarSelector !== false) && (
                  <div
                    className="hero-fade-4 w-full rounded-2xl border border-border/40 bg-card/70 p-5 shadow-xl backdrop-blur-md lg:w-[22rem]"
                    style={{ visibility: settings === undefined ? 'hidden' : 'visible' }}
                  >
                    <p className="mb-3 text-sm font-semibold text-white/60 uppercase tracking-wider">Ընտրել մեքենա</p>
                    <VehicleSelector />
                  </div>
                )}
              </div>

              <div className="relative z-10 border-t border-white/20 px-6 py-4 sm:px-8">
                <div className="hero-fade-4 flex flex-wrap items-center" style={{ gap: 'var(--space-3) var(--space-6)' }}>
                  {[
                    { Icon: Truck, label: 'Արագ առաքում ողջ ՀՀ-ում' },
                    { Icon: Shield, label: 'Երաշխիք ապրանքների վրա' },
                    { Icon: Clock, label: '24/7 աջակցություն' },
                    { Icon: Star, label: 'Բնօրինակ որակ' },
                  ].map(({ Icon, label }) => (
                    <span key={label} className="flex items-center gap-2 text-white/70" style={{ fontSize: 'var(--text-sm)' }}>
                      <Icon className="h-4 w-4 text-white/80" /> {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Top Sales — separate section under hero */}
        {settings?.showFeatured !== false && (featured === undefined || featured.length > 0) && (
          <section className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-section)' }}>
            <div className="rounded-3xl border border-border/40 bg-card/40 p-6 backdrop-blur-md sm:p-8">
              <div className="mb-5 flex items-center justify-between gap-2">
                <h2 className="text-balance font-bold" style={{ fontSize: 'var(--text-2xl)' }}>Ցանկ</h2>
                <Link href="/products">
                  <Button variant="outline" className="gap-2">Դիտել բոլորը <ArrowRight style={{ height: '1rem', width: '1rem' }} /></Button>
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {featured === undefined
                  ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="animate-pulse rounded-xl bg-muted" style={{ height: '12rem' }} />)
                  : featured.slice(0, 4).map((p, i) => (
                      <HeroMiniCard key={p._id} product={p} index={i} />
                    ))}
              </div>
            </div>
          </section>
        )}

        {/* Categories */}
        {settings?.showCategories !== false && (
        <section className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-section)' }}>
          <h2 className="text-center text-balance font-bold" style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-8)' }}>{HOME.categoriesTitle}</h2>
          <div className="grid sm:grid-cols-2 gap-4 md:grid-cols-4">
            {categories === undefined
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="animate-pulse rounded-xl bg-muted" style={{ height: '8rem' }} />)
              : categories.slice(0, 4).map((cat, i) => <CategoryCard key={cat._id} id={cat._id} name={cat.name} slug={cat.slug} description={cat.description} index={i} />)}
          </div>
          <div className="mt-8 flex justify-center">
            <Link href="/categories"><Button size="lg" variant="outline" className="gap-2">Դիտել բոլորը <ArrowRight style={{ height: '1rem', width: '1rem' }} /></Button></Link>
          </div>
        </section>
        )}

        {/* Brands — luxury showcase */}
        {settings?.showBrands !== false && (
        <section className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-section)' }}>
          <h2 className="text-center text-balance font-bold tracking-tight" style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-8)' }}>
            <span className="text-gradient">Բրենդեր</span>
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {brands === undefined && Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-20 w-[190px] animate-pulse rounded-2xl bg-muted" />
            ))}
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
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black tracking-widest"
                    style={{ background: color, color: brandTextColor(color), boxShadow: `0 2px 8px ${color}66` }}>
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

        {/* Featured Products — ցուցադրված ապրանքներ */}
        {settings?.showFeatured !== false && (featured === undefined || featured.length > 0) && (
          <section className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-section)' }}>
            <div className="flex flex-col items-start sm:items-center justify-between mb-8 gap-2">
              <h2 className="text-center text-balance font-bold" style={{ fontSize: 'var(--text-2xl)' }}>Թոփ վաճառք</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {featured === undefined
                ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="animate-pulse rounded-xl bg-muted" style={{ height: '16rem' }} />)
                : featured.slice(0, 4).map((p, i) => (
                    <ProductCard key={p._id} id={p._id} slug={p.slug} atgCode={p.atgCode} sku={p.sku} name={p.name} price={p.price} wholesalePrice={p.wholesalePrice} compareAtPrice={p.compareAtPrice} retailDiscount={p.retailDiscount} wholesaleDiscount={p.wholesaleDiscount} image={p.images?.[0]} inStock={p.stock > 0} stock={p.stock} qtyStep={p.qtyStep} rating={p.rating} reviewCount={p.reviewCount} carBrand={p.attributes?.carBrand} attributes={p.attributes} index={i} isHit={p.isFeatured} />
                  ))}
            </div>
            <div className="mt-8 flex justify-center">
              <Link href="/products"><Button size="lg" variant="outline" className="gap-2">Դիտել բոլորը <ArrowRight style={{ height: '1rem', width: '1rem' }} /></Button></Link>
            </div>
          </section>
        )}

        {/* Discounts */}
        {hasDiscounts && (
          <section className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-section)' }}>
            <div className="rounded-3xl border border-destructive/20 bg-gradient-to-br from-destructive/5 via-card/60 to-orange-500/5 p-6 backdrop-blur-md sm:p-8">
              <div className="mb-5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10">
                    <span className="text-lg">🔥</span>
                  </div>
                  <h2 className="font-bold" style={{ fontSize: 'var(--text-2xl)' }}>Զեղչեր</h2>
                </div>
                <Link href="/discounts">
                  <Button variant="outline" className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 dark:border-red-300/50 dark:text-red-200 dark:hover:bg-red-300/10">Դիտել բոլորը <ArrowRight style={{ height: '1rem', width: '1rem' }} /></Button>
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {discountedSample === undefined
                  ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="animate-pulse rounded-xl bg-muted" style={{ height: '12rem' }} />)
                  : discountedSample.map((p, i) => (
                      <ProductCard
                        key={p._id}
                        id={p._id}
                        slug={p.slug}
                        name={p.name}
                        price={p.price}
                        wholesalePrice={p.wholesalePrice}
                        retailDiscount={p.retailDiscount}
                        wholesaleDiscount={p.wholesaleDiscount}
                        image={p.images?.[0]}
                        inStock={p.stock > 0}
                        stock={p.stock}
                        sku={p.sku}
                        atgCode={p.atgCode}
                        qtyStep={p.qtyStep}
                        rating={p.rating}
                        reviewCount={p.reviewCount}
                        attributes={p.attributes as Record<string, unknown>}
                        index={i}
                      />
                    ))}
              </div>
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
      </div>
      <Footer />
    </div>
  );
}

/* ─── Hero Mini Card — full ProductCard hover treatment ─── */
function HeroMiniCard({ product, index = 0 }: { product: NonNullable<ReturnType<typeof useQuery<typeof api.products.getFeatured>>>[number]; index?: number }) {
  const { mousePos, isHovered, handlers } = useMouseGlow();
  const currentUser = useAuthStore((s) => s.user);
  const isWholesale = currentUser?.customerType === 'wholesale' && currentUser?.role !== 'admin';
  const userDiscount = currentUser?.role !== 'admin' ? (currentUser?.discountPercent ?? 0) : 0;
  const displayPrice = isWholesale
    ? (typeof product.wholesalePrice === 'number' && product.wholesalePrice > 0
        ? product.wholesalePrice
        : Math.round(product.price * (1 - userDiscount / 100)))
    : (product.retailDiscount && product.retailDiscount > 0
        ? Math.round(product.price * (1 - product.retailDiscount / 100))
        : product.price);
  return (
    <Link
      href={`/products/${product.slug}`}
      {...handlers}
      className="group relative overflow-hidden rounded-2xl border bg-background/80 backdrop-blur-sm card-modern aspect-3/4"
      style={{
        viewTransitionName: `hero-product-${product._id}`,
        transition: 'transform 0.4s cubic-bezier(0.22,1,0.36,1), box-shadow 0.4s ease, border-color 0.4s cubic-bezier(0.22,1,0.36,1)',
        transform: isHovered
          ? `translateY(-8px) scale(1.02) perspective(1000px) rotateX(${(mousePos.y - 150) / -30}deg) rotateY(${(mousePos.x - 100) / 30}deg)`
          : 'translateY(0) scale(1) perspective(1000px) rotateX(0deg) rotateY(0deg)',
        boxShadow: isHovered ? 'var(--shadow-card-hover)' : 'var(--shadow-card)',
      }}
    >
      {/* Mouse-follow radial glow (same as ProductCard) */}
      {isHovered && (
        <div
          className="pointer-events-none absolute inset-0 -z-10 rounded-2xl"
          style={{ background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, oklch(0.6 0.14 248 / 0.14), transparent 50%)`, filter: 'blur(30px)' }}
        />
      )}

      {/* Image with subtle zoom on hover */}
      {product.images?.[0] ? (
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          loading={index < 2 ? 'eager' : 'lazy'}
          fetchPriority={index < 2 ? 'high' : 'auto'}
          sizes="(max-width: 640px) 50vw, 200px"
          className="h-full w-full object-fill transition-transform duration-500 group-hover:scale-110"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/50 to-muted/30 text-muted-foreground/30">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
        </div>
      )}

      {/* Bottom gradient vignette — always visible on mobile, hover-only on desktop */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-foreground/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Info overlay — fade in/out only, no slide */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/80 to-transparent p-3 pt-14 text-center transition-all duration-300 md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100">
        <p className="text-[11px] font-semibold text-white line-clamp-2 drop-shadow-md">{product.name}</p>
        {product.sku && <p className="mt-1 text-[10px] text-white drop-shadow-md">Արտիկուլ: <span className="font-mono">{product.sku}</span></p>}
        <p className="mt-1 text-sm font-bold text-white drop-shadow-md">{formatPrice(displayPrice)}</p>
      </div>

      {/* Featured badge — magnetic glass pill that follows mouse tilt */}
      {product.isFeatured && (
        <div
          className="absolute left-2 top-2 z-10"
          style={{
            transition: 'transform 0.4s cubic-bezier(0.22,1,0.36,1)',
            transform: isHovered
              ? `translate(${(mousePos.x - 100) / 15}px, ${(mousePos.y - 120) / 15}px)`
              : 'translate(0, 0)',
          }}
        >
          <div className="badge-hit-solid relative overflow-hidden rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide text-white shadow-lg transition-all duration-300 group-hover:shadow-[0_0_16px_oklch(0.7_0.15_80/0.6)] group-hover:scale-110">
            <span className="relative z-10 flex items-center gap-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              <svg className="h-2.5 w-2.5 animate-pulse fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              Թոփ
            </span>
            <div className="badge-shimmer absolute inset-0 z-0 opacity-40" aria-hidden="true" />
          </div>
        </div>
      )}
    </Link>
  );
}
