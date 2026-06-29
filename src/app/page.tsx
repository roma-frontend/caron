"use client";
import { useState, useEffect } from "react";
import Link from "@/components/LocalizedLink";
import { Button } from "@/components/ui/button";
import { ArrowRight, Truck, Shield, Clock, Star } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { FEATURES } from "@/lib/constants";
import { ProductCard } from "@/components/cards/ProductCard";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { HomeStories } from "@/components/home/HomeStories";
import { HomeBanners } from "@/components/home/HomeBanners";
import { ForYou } from "@/components/home/ForYou";
import { NewArrivals } from "@/components/home/NewArrivals";
import { DeliveryPromo } from "@/components/home/DeliveryPromo";
import { Bestsellers } from "@/components/home/Bestsellers";
import { CategoryShelves } from "@/components/home/CategoryShelves";
import { FlashCountdown } from "@/components/home/FlashCountdown";
import { CategoryCard } from "@/components/cards/CategoryCard";
import { VehicleSelector } from "@/components/VehicleSelector";
import { useReveal, revealStyle } from "@/lib/motion";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSettings } from "@/hooks/useSettings";
import { useAuthStore } from "@/store/auth";
import { toR2MediaProxyUrl } from "@/lib/r2Media";
import Image from "next/image";
import { useT } from "@/lib/i18n/admin";
import { useStoreName } from "@/hooks/useStoreName";

const FEATURE_ICONS = {
  delivery: Truck,
  warranty: Shield,
  support: Clock,
  quality: Star,
};

const HERO_VIDEO_SRC = toR2MediaProxyUrl(
  process.env.NEXT_PUBLIC_HERO_VIDEO_URL || "products/hero-opt.mp4",
);

// Lightweight poster shown instantly as the hero background. It becomes the LCP
// element (small, discoverable in HTML), so LCP no longer waits on the video.
const HERO_POSTER_SRC = toR2MediaProxyUrl(
  process.env.NEXT_PUBLIC_HERO_POSTER_URL || "products/hero-poster.jpg",
);

function FeatureItem({
  feature,
  index,
}: {
  feature: (typeof FEATURES)[number];
  index: number;
}) {
  const { ref, visible } = useReveal();
  const { t } = useT();
  const Icon = FEATURE_ICONS[feature.key as keyof typeof FEATURE_ICONS];

  return (
    <div
      ref={ref}
      style={revealStyle(visible, index * 0.1)}
      className="flex items-start"
    >
      <div
        style={{
          gap: "var(--space-4)",
          padding: "var(--space-4)",
          display: "flex",
          alignItems: "flex-start",
        }}
      >
        <div
          className="flex shrink-0 items-center justify-center rounded-lg bg-primary/10"
          style={{ height: "3rem", width: "3rem" }}
        >
          <Icon
            className="text-primary"
            style={{ height: "1.5rem", width: "1.5rem" }}
          />
        </div>
        <div>
          <h3 className="font-semibold">{t(`pg.home.feature.${feature.key}.title`)}</h3>
          <p
            className="text-muted-foreground"
            style={{ fontSize: "var(--text-sm)" }}
          >
            {t(`pg.home.feature.${feature.key}.desc`)}
          </p>
        </div>
      </div>
    </div>
  );
}

type PriorityVideoProps = React.VideoHTMLAttributes<HTMLVideoElement> & {
  fetchPriority?: "high" | "low" | "auto";
};

function PingPongVideo({
  src,
  poster,
  className,
}: {
  src: string;
  poster?: string;
  className?: string;
}) {
  // Defer the heavy (~1.7 MB) decorative hero video until after the page has
  // loaded so it doesn't compete with the LCP/critical resources. An eager
  // poster image (below) paints instantly and serves as the LCP element.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    let timer: number | undefined;
    const start = () => {
      timer = window.setTimeout(() => setMounted(true), 150);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("load", start);
    };
  }, []);

  const videoProps: PriorityVideoProps = {
    src,
    autoPlay: true,
    muted: true,
    loop: true,
    playsInline: true,
    preload: "auto",
    width: 1920,
    height: 1080,
    fetchPriority: "low",
    "aria-hidden": true,
  };

  return (
    <>
      {poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          aria-hidden="true"
          width={1920}
          height={1080}
          fetchPriority="high"
          decoding="async"
          className={className}
        />
      )}
      {mounted && <video {...videoProps} className={className} />}
    </>
  );
}

export default function HomePage() {
  const { t } = useT();
  const storeName = useStoreName();
  const categories = useQuery(api.categories.list, {});
  const featured = useQuery(api.products.getFeatured, {});
  const brandLogos = useQuery(api.brands.list, {});
  const user = useAuthStore((s) => s.user);
  const isWholesale =
    user?.customerType === "wholesale" && user?.role !== "admin";
  // Only fetch the price tier the current visitor actually sees: retail users
  // never use the wholesale list and vice-versa. Skipping the other halves this
  // query for every visit (saves a Convex function call + subscription).
  const discounted = useQuery(
    api.products.getRetailDiscounted,
    isWholesale ? "skip" : {},
  );
  const wholesaleDiscounted = useQuery(
    api.products.getWholesaleDiscounted,
    isWholesale ? {} : "skip",
  );
  const discountedSample = isWholesale
    ? wholesaleDiscounted?.slice(0, 4)
    : discounted?.slice(0, 4);
  const hasDiscounts = isWholesale
    ? wholesaleDiscounted === undefined || wholesaleDiscounted.length > 0
    : discounted === undefined || discounted.length > 0;
  const settings = useSettings();
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <div className="min-w-0 flex-1">
        {/* Hero — integrated section module */}
        <section
          className="relative min-h-[calc(100svh-var(--header-height))] sm:min-h-0 overflow-hidden lg:min-h-0 lg:px-[max(var(--space-container),0.75rem)] lg:pt-[var(--space-8)] lg:pb-[var(--space-10)]"
          data-hero
        >
          <div
            className="absolute inset-0 -z-10 overflow-hidden"
            aria-hidden="true"
          >
            <div
              className="absolute left-[-6%] top-[-25%] h-[620px] w-[620px] rounded-full mesh-orb-1"
              style={{
                background:
                  "radial-gradient(circle, var(--landing-orb-1) 0%, transparent 70%)",
                filter: "blur(95px)",
              }}
            />
            <div
              className="absolute right-[-10%] top-[0%] h-[560px] w-[560px] rounded-full mesh-orb-2"
              style={{
                background:
                  "radial-gradient(circle, var(--landing-orb-2) 0%, transparent 70%)",
                filter: "blur(95px)",
              }}
            />
          </div>

          <div className="mx-auto lg:max-w-[var(--container-max)]">
            <div
              className="group relative overflow-hidden lg:rounded-4xl border-0 lg:border border-border/50 shadow-[0_20px_60px_rgba(0,0,0,0.18)] min-h-[calc(100svh-var(--header-height))] sm:min-h-0 lg:min-h-0 flex flex-col md:p-8"
              onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty(
                  "--sx",
                  `${e.clientX - r.left}px`,
                );
                e.currentTarget.style.setProperty(
                  "--sy",
                  `${e.clientY - r.top}px`,
                );
              }}
            >
              <PingPongVideo
                src={HERO_VIDEO_SRC}
                poster={HERO_POSTER_SRC}
                className="absolute inset-0 h-full w-full object-cover hero-video"
              />
              {/* Blue tint overlay */}
              <div className="absolute inset-0 bg-blue-950/50 mix-blend-multiply" />
              {/* Dark overlay for readability */}
              <div className="absolute inset-0 bg-black/40" />
              {/* Vignette */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.65) 100%)",
                }}
              />
              {/* Spotlight — follows cursor */}
              <div
                className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                style={{
                  background:
                    "radial-gradient(400px circle at var(--sx, 50%) var(--sy, 50%), rgba(99,179,255,0.12), transparent 70%)",
                }}
              />
              <div
                className="pointer-events-none absolute inset-0 opacity-70"
                style={{
                  background:
                    "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.03) 45%, transparent 100%)",
                }}
              />

              <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/20 px-6 py-4 sm:px-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />{" "}
                  {t('pg.home.heroBadge')}
                </div>
              </div>

              <div className="relative z-10 flex flex-1 flex-col gap-7 px-6 py-8 sm:px-8 lg:flex-row lg:items-stretch lg:gap-10 lg:py-10 text-white justify-center">
                <div className="flex flex-1 flex-col justify-center">
                  <h1
                    className="hero-fade-2 text-balance font-black tracking-tighter text-white"
                    style={{
                      fontSize: "clamp(2rem, 5vw, 3.75rem)",
                      lineHeight: "var(--line-height-tight)",
                      marginBottom: "var(--space-6)",
                      textShadow: "0 2px 20px rgba(0,0,0,0.5)",
                    }}
                  >
                    {t('pg.home.heroTitle')}
                  </h1>

                  <p
                    className="hero-fade-3 text-balance text-white/75"
                    style={{
                      fontSize: "var(--text-lg)",
                      maxWidth: "36rem",
                      marginBottom: "var(--space-8)",
                      lineHeight: "var(--line-height-relaxed)",
                    }}
                  >
                    {storeName}{t('pg.home.brandDescSuffix')}
                  </p>

                  <div
                    className="hero-fade-4 flex flex-col sm:flex-row"
                    style={{ gap: "var(--space-4)" }}
                  >
                    <Link href="/products">
                      <Button size="lg" style={{ gap: "var(--space-2)" }}>
                        {t('pg.home.ctaCatalog')}{" "}
                        <ArrowRight style={{ height: "1rem", width: "1rem" }} />
                      </Button>
                    </Link>
                    <Link href="/categories">
                      <Button
                        size="lg"
                        variant="outline"
                        className="border-white/50 bg-white/10 text-white hover:bg-white/20 hover:border-white/70 hover:text-white"
                      >
                        {t('pg.home.ctaCategories')}
                      </Button>
                    </Link>
                  </div>
                </div>

                {settings !== undefined && settings?.enableCarSelector !== false && (
                  <div
                    className="hero-fade-4 hidden lg:block w-full rounded-2xl border border-border/40 bg-card/70 p-5 shadow-xl backdrop-blur-md lg:w-[22rem]"
                  >
                    <p className="mb-3 text-sm font-semibold text-white/60 uppercase tracking-wider">
                      {t('pg.home.selectCar')}
                    </p>
                    <VehicleSelector />
                  </div>
                )}
              </div>

              <div className="relative z-10 border-t border-white/20 px-6 py-3 sm:px-8 sm:py-4">
                <div
                  className="hero-fade-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:flex-wrap sm:items-center"
                  style={{ gap: "var(--space-2) var(--space-4)" }}
                >
                  {[
                    { Icon: Truck, label: t('pg.home.feat.deliveryAll') },
                    { Icon: Shield, label: t('pg.home.feat.warranty') },
                    { Icon: Clock, label: t('pg.home.feat.support247') },
                    { Icon: Star, label: t('pg.home.feat.originalQuality') },
                  ].map(({ Icon, label }) => (
                    <span
                      key={label}
                      className="flex items-center gap-2 text-white/85 text-[13px] leading-tight sm:text-sm"
                    >
                      <Icon className="h-3.5 w-3.5 text-white/80 sm:h-4 sm:w-4" />{" "}
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      {/* Rest of page content — normal flow */}
      <div className="min-w-0">
        {/* Stories + promo banners (WB/OZON style) — auto-hide when empty */}
        {settings?.showStories !== false && <HomeStories />}
        {settings?.showBanners !== false && <HomeBanners />}

        {/* Categories */}
        {settings?.showCategories !== false && (
          <section className="mx-auto max-w-[var(--container-max)] px-4 sm:px-[var(--space-container)] py-[var(--space-section)]">
            <h2
              className="text-center text-balance font-bold"
              style={{
                fontSize: "var(--text-2xl)",
                marginBottom: "var(--space-8)",
              }}
            >
              {t('pg.home.categoriesTitle')}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4 md:grid-cols-4">
              {categories === undefined
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse rounded-xl bg-muted"
                      style={{ height: "8rem" }}
                    />
                  ))
                : categories
                    .slice(0, 4)
                    .map((cat, i) => (
                      <CategoryCard
                        key={cat._id}
                        id={cat._id}
                        name={cat.name}
                        nameRu={cat.nameRu}
                        nameEn={cat.nameEn}
                        slug={cat.slug}
                        description={cat.description}
                        descriptionRu={cat.descriptionRu}
                        descriptionEn={cat.descriptionEn}
                        index={i}
                      />
                    ))}
            </div>
            <div className="mt-8 flex justify-center">
              <Link href="/categories">
                <Button size="lg" variant="outline" className="gap-2">
                  {t('pg.common.viewAll')}{" "}
                  <ArrowRight style={{ height: "1rem", width: "1rem" }} />
                </Button>
              </Link>
            </div>
          </section>
        )}
        {settings?.showNewArrivals !== false && <NewArrivals />}

        {settings?.showFeatured !== false &&
          (featured === undefined || featured.length > 0) && (
            <section className="mx-auto max-w-[var(--container-max)] px-0 pt-[var(--space-8)] pb-[var(--space-section)] sm:px-[var(--space-container)]">
              <div className="rounded-3xl border border-border/40 bg-card/40 backdrop-blur-md sm:p-8 max-sm:rounded-none max-sm:border-x-0">
                <div className="mb-5 flex items-center justify-between gap-2 p-4 sm:p-0">
                  <h2
                    className="text-balance font-bold"
                    style={{ fontSize: "var(--text-2xl)" }}
                  >
                    {t('pg.home.featuredList')}
                  </h2>
                  <Link href="/products">
                    <Button variant="outline" className="gap-2">
                      {t('pg.common.viewAll')}{" "}
                      <ArrowRight style={{ height: "1rem", width: "1rem" }} />
                    </Button>
                  </Link>
                </div>
                <div className="grid grid-cols-[repeat(var(--grid-cols),minmax(0,1fr))] [--grid-cols:2] md:[--grid-cols:4] gap-1 sm:gap-3">
                  {featured === undefined
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className="animate-pulse rounded-2xl bg-muted"
                          style={{ height: "20rem" }}
                        />
                      ))
                    : featured
                        .slice(0, 4)
                        .map((p, i) => (
                          <ProductCard
                            key={p._id}
                            id={p._id}
                            slug={p.slug}
                            atgCode={p.atgCode}
                            sku={p.sku}
                            name={p.name} nameRu={p.nameRu} nameEn={p.nameEn}
                            price={p.price}
                            wholesalePrice={p.wholesalePrice}
                            compareAtPrice={p.compareAtPrice}
                            retailDiscount={p.retailDiscount}
                            wholesaleDiscount={p.wholesaleDiscount}
                            image={p.images?.[0]}
                            inStock={p.stock > 0}
                            stock={p.stock}
                            rating={p.rating}
                            reviewCount={p.reviewCount}
                            carBrand={p.attributes?.carBrand}
                            qtyStep={p.qtyStep}
                            attributes={p.attributes}
                            index={i}
                          />
                        ))}
                </div>
              </div>
            </section>
          )}

        {/* Personalized recommendations + new arrivals (auto-hide when empty) */}
        {settings?.showForYou !== false && <ForYou />}
        {settings?.showBestsellers !== false && <Bestsellers />}

        {/* Brands — luxury showcase */}
        {settings?.showBrands !== false && brandLogos && brandLogos.length > 0 && (
          <section className="mx-auto max-w-[var(--container-max)] sm:px-[var(--space-container)] py-[var(--space-section)]">
            <h2
              className="text-center text-balance font-bold tracking-tight"
              style={{
                fontSize: "var(--text-2xl)",
                marginBottom: "var(--space-8)",
              }}
            >
              <span className="text-gradient">{t('pg.home.brands')}</span>
            </h2>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
              {brandLogos.slice(0, 12).map((b) => (
                <Link
                  key={b._id}
                  href={`/products?brand=${encodeURIComponent(b.name)}`}
                  className="group flex h-20 w-[140px] items-center justify-center rounded-2xl border border-border/60 bg-white p-3 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:w-[170px]"
                  title={b.name}
                >
                  {b.logoUrl ? (
                    <div className="relative h-12 w-full">
                      <Image src={b.logoUrl} alt={b.name} fill sizes="170px" className="object-contain" />
                    </div>
                  ) : (
                    <span className="text-lg font-bold text-foreground/80">{b.name}</span>
                  )}
                </Link>
              ))}
              <Link
                href="/brands"
                className="group flex h-20 w-[140px] items-center justify-center gap-2.5 rounded-2xl border border-dashed border-muted-foreground/20 bg-card/50 text-muted-foreground transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:text-primary hover:shadow-lg sm:w-[170px]"
              >
                <span className="text-2xl font-light leading-none transition-transform duration-500 group-hover:rotate-90">
                  +
                </span>
                <span className="text-sm font-medium">{t('pg.home.allBrands')}</span>
              </Link>
            </div>
          </section>
        )}

        {/* Featured Products — ցուցադրված ապրանքներ */}
        {settings?.showFeatured !== false &&
          (featured === undefined || featured.length > 0) && (
            <section className="mx-auto max-w-[var(--container-max)] sm:px-[var(--space-container)] py-[var(--space-section)]">
              <div className="flex flex-col items-start sm:items-center justify-between mb-8 gap-2 p-4 sm:p-0">
                <h2
                  className="text-center text-balance font-bold"
                  style={{ fontSize: "var(--text-2xl)" }}
                >
                  {t('pg.home.topSales')}
                </h2>
              </div>
              <div className="grid grid-cols-[repeat(var(--grid-cols),minmax(0,1fr))] [--grid-cols:2] md:[--grid-cols:4] gap-1 sm:gap-3">
                {featured === undefined
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="animate-pulse rounded-xl bg-muted"
                        style={{ height: "16rem" }}
                      />
                    ))
                  : featured
                      .slice(0, 4)
                      .map((p, i) => (
                        <ProductCard
                          key={p._id}
                          id={p._id}
                          slug={p.slug}
                          atgCode={p.atgCode}
                          sku={p.sku}
                          name={p.name} nameRu={p.nameRu} nameEn={p.nameEn}
                          price={p.price}
                          wholesalePrice={p.wholesalePrice}
                          compareAtPrice={p.compareAtPrice}
                          retailDiscount={p.retailDiscount}
                          wholesaleDiscount={p.wholesaleDiscount}
                          image={p.images?.[0]}
                          inStock={p.stock > 0}
                          stock={p.stock}
                          qtyStep={p.qtyStep}
                          rating={p.rating}
                          reviewCount={p.reviewCount}
                          carBrand={p.attributes?.carBrand}
                          attributes={p.attributes}
                          index={i}
                          isHit={p.isFeatured}
                        />
                      ))}
              </div>
              <div className="mt-8 flex justify-center">
                <Link href="/products">
                  <Button size="lg" variant="outline" className="gap-2">
                    {t('pg.common.viewAll')}{" "}
                    <ArrowRight style={{ height: "1rem", width: "1rem" }} />
                  </Button>
                </Link>
              </div>
            </section>
          )}

        {/* Discounts */}
        {settings?.showDiscounts !== false && hasDiscounts && (
          <section className="mx-auto max-w-[var(--container-max)] px-0 pt-[var(--space-8)] pb-[var(--space-section)] sm:px-[var(--space-container)]">
            <div className="rounded-3xl border border-destructive/20 bg-gradient-to-br from-destructive/5 via-card/60 to-orange-500/5 backdrop-blur-md sm:p-8 max-sm:rounded-none max-sm:border-x-0">
              <div className="mb-5 flex flex-col flex-wrap items-center justify-between gap-2 p-6 sm:p-0">
                <div className="w-full flex min-w-0 items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10">
                      <span className="text-lg">🔥</span>
                    </div>
                    <h2
                      className="font-bold"
                      style={{ fontSize: "var(--text-2xl)" }}
                    >
                      {t('pg.home.discounts')}
                    </h2>
                  </div>
                  <FlashCountdown className="ml-1" />
                </div>
                <Link href="/discounts" className="self-end mt-2 sm:mt-0">
                  <Button
                    variant="outline"
                    className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 dark:border-red-300/50 dark:text-red-200 dark:hover:bg-red-300/10"
                  >
                    {t('pg.common.viewAll')}{" "}
                    <ArrowRight style={{ height: "1rem", width: "1rem" }} />
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-[repeat(var(--grid-cols),minmax(0,1fr))] [--grid-cols:2] md:[--grid-cols:4] gap-1 sm:gap-3">
                {discountedSample === undefined
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="animate-pulse rounded-xl bg-muted"
                        style={{ height: "12rem" }}
                      />
                    ))
                  : discountedSample.map((p, i) => (
                      <ProductCard
                        key={p._id}
                        id={p._id}
                        slug={p.slug}
                        name={p.name} nameRu={p.nameRu} nameEn={p.nameEn}
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

        {/* Per-category product shelves (OZON-style) — auto-hide when sparse */}
        {settings?.showShelves !== false && <CategoryShelves limit={4} />}

        {/* Features */}
        {settings?.showFeatures !== false && (
          <section className="bg-muted/30 py-6 sm:py-[var(--space-section)]">
            <div className="mx-auto max-w-[var(--container-max)] px-0 sm:px-[var(--space-container)]">
              <div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
                style={{ gap: "var(--space-6)" }}
              >
                {FEATURES.map((f, i) => (
                  <FeatureItem key={f.key} feature={f} index={i} />
                ))}
              </div>
            </div>
          </section>
        )}
        <RecentlyViewed />

        {/* Delivery promo strip (WB-style, real product images) */}
        <DeliveryPromo />
      </div>
      <Footer />
      <MobileNav />
    </div>
  );
}

/* ─── Hero Mini Card — full ProductCard hover treatment ─── */
/* HeroMiniCard removed — featured products now use the shared ProductCard. */
