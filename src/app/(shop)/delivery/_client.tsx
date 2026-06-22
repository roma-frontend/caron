'use client';

import { CmsPageWrapper } from '@/components/shared/CmsPageWrapper';

import { useSettings } from '@/hooks/useSettings';
import { formatPrice } from '@/lib/formatters';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Truck,
  Clock,
  MapPin,
  Package,
  CheckCircle,
  ShieldCheck,
  Phone,
  Gift,
} from 'lucide-react';
import { DeliverySchedule } from '@/components/DeliverySchedule';
import { useReveal, revealStyle } from '@/lib/motion';

const STEPS = [
  {
    icon: CheckCircle,
    title: 'Պատվեր',
    text: 'Կատարեք պատվերը կայքում',
  },
  {
    icon: Clock,
    title: 'Հաստատում',
    text: 'Մենք կհաստատենք պատվերը',
  },
  {
    icon: Package,
    title: 'Փաթեթավորում',
    text: 'Պատվերը կպատրաստվի առաքման',
  },
  {
    icon: Truck,
    title: 'Առաքում',
    text: 'Ստացեք պատվերը նշված հասցեով',
  },
];

const FEATURES = [
  { icon: ShieldCheck, title: 'Անվտանգ փաթեթավորում', desc: 'Ապրանքները հասնում են անվնաս և ապահով' },
  { icon: Clock, title: 'Արագ առաքում', desc: 'Հաստատումից հետո՝ կարճ ժամկետներում' },
  { icon: MapPin, title: 'Ամբողջ Հայաստանով', desc: 'Առաքում Երևան և բոլոր մարզեր' },
];

function MethodCard({
  method,
  index,
}: {
  method: {
    icon: typeof Truck;
    title: string;
    time: string;
    price: string;
    isFree: boolean;
    desc: string;
  };
  index: number;
}) {
  const { ref, visible } = useReveal();
  const Icon = method.icon;
  return (
    <div ref={ref} style={revealStyle(visible, index * 0.1)}>
      <Card
        className="group h-full overflow-hidden transition-all hover:shadow-lg"
        style={{ boxShadow: 'var(--shadow-sm)' }}
      >
        <CardContent className="flex flex-col gap-4 p-6">
          <div className="flex items-start justify-between">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 transition-transform group-hover:scale-105">
              <Icon className="h-7 w-7 text-primary" />
            </div>
            <Badge
              variant={method.isFree ? 'default' : 'secondary'}
              className="text-sm font-semibold"
            >
              {method.price}
            </Badge>
          </div>

          <div>
            <h3 className="text-lg font-bold">{method.title}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-primary">
              <Clock className="h-4 w-4" />
              {method.time}
            </p>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {method.desc}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FeatureItem({
  feature,
  index,
}: {
  feature: typeof FEATURES[number];
  index: number;
}) {
  const { ref, visible } = useReveal();
  const Icon = feature.icon;
  return (
    <div
      ref={ref}
      style={revealStyle(visible, index * 0.1)}
      className="flex flex-col items-center text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="mt-3 font-semibold">{feature.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{feature.desc}</p>
    </div>
  );
}

export default function DeliveryPage() {
  const settings = useSettings();

  const yerevanFree = (settings?.deliveryYerevan ?? 0) === 0;
  const regionsFree = (settings?.deliveryRegions ?? 0) === 0;
  const freeThreshold = settings?.freeShippingThreshold ?? 0;

  const METHODS = [
    {
      icon: Truck,
      title: 'Առաքում Երևանում',
      time: '1-3 աշխատանքային օր',
      price: yerevanFree ? 'Անվճար' : formatPrice(settings?.deliveryYerevan ?? 0),
      isFree: yerevanFree,
      desc: 'Արագ և անվտանգ առաքում Երևանի ողջ տարածքում',
    },
    {
      icon: Package,
      title: 'Առաքում մարզեր',
      time: '2-5 աշխատանքային օր',
      price: regionsFree ? 'Անվճար' : formatPrice(settings?.deliveryRegions ?? 0),
      isFree: regionsFree,
      desc: 'Առաքում Հայաստանի բոլոր մարզեր՝ վստահելի գործընկերներով',
    },
  ];

  return (
    <CmsPageWrapper slug="delivery">
      <div>
        {/* Hero */}
        <section
          className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5"
          style={{ paddingBlock: 'var(--space-16)' }}
        >
          <div className="mx-auto text-center max-w-[var(--container-max)] px-[var(--space-container)]">
            <Badge variant="default" className="mb-4 gap-1.5">
              <Truck className="h-3.5 w-3.5" />
              Առաքում
            </Badge>
            <h1 className="text-3xl font-bold md:text-4xl">
              Արագ և հարմար առաքում
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground leading-relaxed">
              Առաքում ենք ամբողջ Հայաստանի տարածքում՝ արագ, ապահով և քո հարմարության համար։
            </p>
          </div>
        </section>

        <div
          className="mx-auto max-w-[var(--container-max)] px-[var(--space-container)]"
          style={{ paddingBlock: 'var(--space-12)' }}
        >
          {/* Methods */}
          <div className="grid gap-6 md:grid-cols-2">
            {METHODS.map((m, i) => (
              <MethodCard key={m.title} method={m} index={i} />
            ))}
          </div>

          {/* Free shipping highlight */}
          {freeThreshold > 0 && (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center sm:flex-row sm:justify-center sm:text-left">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Gift className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm sm:text-base">
                <span className="font-semibold">Անվճար առաքում</span>{' '}
                {formatPrice(freeThreshold)}-ից բարձր պատվերների դեպքում
              </p>
            </div>
          )}

          {/* Features */}
          <div className="mt-12 grid gap-8 rounded-2xl border bg-muted/30 p-8 sm:grid-cols-3">
            {FEATURES.map((f, i) => (
              <FeatureItem key={f.title} feature={f} index={i} />
            ))}
          </div>

          {/* Steps timeline */}
          <section className="mt-16">
            <h2 className="mb-10 text-center text-2xl font-bold">
              Առաքման փուլերը
            </h2>

            <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {/* connector line on large screens */}
              <div className="absolute left-0 right-0 top-6 hidden h-px bg-border lg:block" />

              {STEPS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div
                    key={i}
                    className="relative flex flex-col items-center text-center"
                  >
                    <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary bg-background text-primary">
                      <Icon className="h-5 w-5" />
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                        {i + 1}
                      </span>
                    </div>
                    <h3 className="mt-4 font-semibold">{s.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Delivery schedule by location */}
          <DeliverySchedule />

          {/* Contact note */}
          <div className="mt-16 overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/5 to-accent/5 p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <p className="text-lg font-semibold">
              Առաքում ամբողջ Հայաստանի տարածքում
            </p>
            <div className="mt-4 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground sm:flex-row sm:gap-6">
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                {settings?.address ?? 'Երևան, Հայաստան'}
              </span>
              <span className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                {settings?.phone ?? '+374 XX XXX XXX'}
              </span>
              {settings?.workingHours && (
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  {settings.workingHours}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </CmsPageWrapper>
  );
}
