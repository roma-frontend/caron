'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Clock, Flame, Percent, Gift, Zap, Bell, ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { useReveal, cardRevealStyle } from '@/lib/motion';
import { ProductCard } from '@/components/cards/ProductCard';
import { Loader } from '@/components/ui/loader';
import Image from 'next/image';
import { toast } from 'sonner';

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

function PromoCard({ promo, index }: { promo: { _id: string; title: string; description?: string; imageUrl?: string; images?: string[]; discountPercent?: number; endDate: number; categoryIds?: string[]; productIds?: string[] }; index: number }) {
  const { ref, visible } = useReveal();

  return (
    <Link href={`/promotions/${promo._id}`} className="group block mx-auto w-full max-w-[420px]">
      <div
        ref={ref}
        style={cardRevealStyle(visible, index * 0.05)}
        className="relative overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
      >
        {/* Gallery frame — matted area around the image */}
        <div className="relative overflow-hidden bg-gradient-to-b from-muted/30 to-muted/10 p-5">
          <div className="relative aspect-square overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-black/[0.04]">
            {promo.imageUrl ? (
              <Image
                src={promo.imageUrl}
                alt=""
                fill
                priority={index < 3}
                loading={index < 3 ? 'eager' : undefined}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-contain p-3 transition-all duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Percent className="h-12 w-12 text-primary/10" strokeWidth={1} />
              </div>
            )}
          </div>

          {/* Discount badge */}
          {promo.discountPercent && (
            <div className="absolute right-6 top-6 inline-flex items-center gap-1 rounded-full bg-destructive px-3 py-1 text-xs font-bold text-white shadow-lg">
              -{promo.discountPercent}%
            </div>
          )}

          {/* Multi-image indicator */}
          {((promo.images?.length ?? 1) > 1) && (
            <div className="absolute left-6 bottom-6 inline-flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur-sm shadow-sm">
              <ImageIcon className="h-3 w-3" />
              {promo.images!.length}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-5 pb-5 pt-3">
          <h3 className="text-sm font-bold leading-snug text-center transition-colors group-hover:text-primary">
            {promo.title}
          </h3>
          {promo.description && (
            <p className="mt-1 text-xs text-muted-foreground text-center line-clamp-2">
              {promo.description}
            </p>
          )}
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
        <ProductCard key={p._id} id={p._id} slug={p.slug} atgCode={p.atgCode} sku={p.sku} name={p.name} price={p.price} wholesalePrice={p.wholesalePrice} compareAtPrice={p.compareAtPrice} image={p.images?.[0]} inStock={p.stock > 0} stock={p.stock} qtyStep={p.qtyStep} rating={p.rating} reviewCount={p.reviewCount} carBrand={p.attributes?.carBrand} attributes={p.attributes} index={i} />
      ))}
    </div>
  );
}

function PromoSubscribe() {
  const [contact, setContact] = useState('');
  const [savedContact, setSavedContact] = useState(() => localStorage.getItem('promo_sub_contact') ?? '');
  const subscribe = useMutation(api.promotionSubscribers.subscribe);
  const unsubscribe = useMutation(api.promotionSubscribers.unsubscribe);
  const isSubscribedQ = useQuery(api.promotionSubscribers.isSubscribed, savedContact ? { contact: savedContact } : 'skip');
  const [busy, setBusy] = useState(false);

  const handleSubscribe = async () => {
    const raw = contact.trim().replace('@', '');
    if (!raw) return;
    setBusy(true);
    try {
      await subscribe({ contact: raw });
      localStorage.setItem('promo_sub_contact', raw);
      setSavedContact(raw);
      setContact('');
      toast.success('Դուք բաժանորդագրվել եք ակցիաների թարմացումներին');
    } catch { toast.error('Չհաջողվեց բաժանորդագրվել'); }
    setBusy(false);
  };

  const handleUnsubscribe = async () => {
    setBusy(true);
    try {
      await unsubscribe({ contact: savedContact });
      localStorage.removeItem('promo_sub_contact');
      setSavedContact('');
      toast.success('Դուք ապաբաժանորդագրվել եք');
    } catch { toast.error('Չհաջողվեց ապաբաժանորդագրվել'); }
    setBusy(false);
  };

  const isSubscribed = savedContact && isSubscribedQ;

  if (isSubscribed) {
    return (
      <div className="flex items-center justify-center gap-3">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Bell className="h-3.5 w-3.5 text-primary" />
          @{savedContact}
        </span>
        <button onClick={handleUnsubscribe} disabled={busy} className="text-xs text-muted-foreground underline-offset-2 hover:text-destructive hover:underline">
          Ապաբաժանորդագրվել
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-3 flex-wrap">
      <Bell className="h-4 w-4 text-primary shrink-0" />
      <span className="text-sm text-muted-foreground whitespace-nowrap">Telegram-ի ծանուցում</span>
      <div className="flex gap-1.5">
        <Input
          placeholder="@username"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className="h-8 w-36 text-xs"
          onKeyDown={(e) => e.key === 'Enter' && handleSubscribe()}
        />
        <Button onClick={handleSubscribe} disabled={busy || !contact.trim()} size="sm" className="h-8 gap-1 text-xs">
          <Bell className="h-3 w-3" /> Բաժանորդագրվել
        </Button>
      </div>
    </div>
  );
}

export default function PromotionsPage() {
  const promotions = useQuery(api.promotions.active, {});
  const promoProducts = useQuery(api.promotions.getPromoProducts, {});

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
        <section className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-section) 0' }}>
          <h2 className="mb-8 text-center text-2xl font-bold">Ակցիաներ</h2>
          <div className="grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
            {promotions.map((promo, i) => <PromoCard key={promo._id} promo={promo} index={i} />)}
          </div>
        </section>
      )}

      {/* Products on sale */}
      {promoProducts && promoProducts.length > 0 && (
        <section className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: '4rem 5rem' }}>
          {/* Decorative divider */}
          <div className="mb-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-muted-foreground/20 to-transparent" />
            <div className="flex items-center gap-2.5 rounded-full border bg-card px-5 py-1.5">
              <Percent className="h-4 w-4 text-destructive" />
              <span className="text-sm font-semibold">Ապրանքներ զեղչով</span>
              <Badge variant="secondary" className="text-[10px] px-1.5">{promoProducts.length}</Badge>
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-muted-foreground/20 to-transparent" />
          </div>
          <div className="grid gap-4 sm:gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {promoProducts.map((p, i) => (
              <ProductCard key={p._id} id={p._id} slug={p.slug} atgCode={p.atgCode} sku={p.sku} name={p.name} price={p.price} wholesalePrice={p.wholesalePrice} compareAtPrice={p.compareAtPrice} image={p.images?.[0]} inStock={p.stock > 0} stock={p.stock} qtyStep={p.qtyStep} rating={p.rating} reviewCount={p.reviewCount} index={i} />
            ))}
          </div>
        </section>
      )}

      {promotions.length === 0 && (!promoProducts || promoProducts.length === 0) && (
        <section className="py-16 text-center">
          <p className="text-lg text-muted-foreground">Ակցիաներ չեն հայտնաբերվել</p>
        </section>
      )}

      {/* Subscribe banner — glass strip at the very bottom */}
      {(promotions.length > 0 || (promoProducts && promoProducts.length > 0)) && (
        <div className="border-t bg-gradient-to-r from-muted/40 via-muted/20 to-muted/40">
          <div className="mx-auto py-5" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)' }}>
            <PromoSubscribe />
          </div>
        </div>
      )}
    </div>
  );
}
