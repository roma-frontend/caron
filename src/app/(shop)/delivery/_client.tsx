'use client';

import { CmsPageWrapper } from '@/components/shared/CmsPageWrapper';

import { useSettings } from '@/hooks/useSettings';
import { formatPrice } from '@/lib/formatters';
import { Card, CardContent } from '@/components/ui/card';
import { Truck, Clock, MapPin, Package, CheckCircle } from 'lucide-react';


// moved inside component

const STEPS = [
  {
    icon: CheckCircle,
    text: 'Կատարեք պատվերը կայքում',
  },
  {
    icon: Clock,
    text: 'Մենք կհաստատենք պատվերը',
  },
  {
    icon: Package,
    text: 'Պատվերը կպատրաստվի առաքման',
  },
  {
    icon: Truck,
    text: 'Ստացեք պատվերը նշված հասցեով',
  },
];

export default function DeliveryPage() {
  const settings = useSettings();
  const METHODS = [
    {
      icon: Truck,
      title: 'Առաքում Երևանում',
      time: '1-3 օր',
      price: (settings?.deliveryYerevan ?? 0) === 0 ? 'Անվճար' : formatPrice(settings?.deliveryYerevan ?? 0),
      desc: 'Արագ և անվտանգ առաքում Երևանի տարածքում',
    },
    {
      icon: Package,
      title: 'Առաքում մարզեր',
      time: '2-5 օր',
      price: (settings?.deliveryRegions ?? 0) === 0 ? 'Անվճար' : formatPrice(settings?.deliveryRegions ?? 0),
      desc: 'Առաքում Հայաստանի բոլոր մարզեր',
    },
  ];
  return (
    <CmsPageWrapper slug="delivery">
    <div
      className="mx-auto"
      style={{
        maxWidth: 'var(--container-max)',
        paddingInline: 'var(--space-container)',
        paddingBlock: 'var(--space-8)',
      }}
    >
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold">Առաքում</h1>
        <p className="mt-2 text-muted-foreground">
          Արագ և հարմար առաքում ամբողջ Հայաստանի տարածքում
        </p>
      </div>

      {/* Methods */}
      <div
        className="grid gap-4 md:grid-cols-2"
        style={{ marginBottom: 'var(--space-12)' }}
      >
        {METHODS.map((m) => (
          <Card
            key={m.title}
            className="transition-all hover:shadow-md"
            style={{ boxShadow: 'var(--shadow-sm)' }}
          >
            <CardContent className="flex gap-4 p-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <m.icon className="h-6 w-6 text-primary" />
              </div>

              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-bold">{m.title}</h3>

                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {m.price}
                  </span>
                </div>

                <p className="mt-0.5 text-sm font-medium text-primary">
                  {m.time}
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  {m.desc}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Steps */}
      <h2 className="mb-6 text-center text-xl font-bold">
        Առաքման փուլերը
      </h2>

      <div className="mx-auto max-w-md space-y-4">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {i + 1}
            </div>

            <p className="text-sm">{s.text}</p>
          </div>
        ))}
      </div>

      {/* Note */}
      <div className="mt-12 rounded-xl border bg-muted/30 p-6 text-center">
        <MapPin className="mx-auto mb-2 h-6 w-6 text-primary" />

        <p className="font-medium">
          Առաքում ամբողջ Հայաստանի տարածքում
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          {settings?.address ?? 'Երևան, Հայաստան'} {settings?.phone ?? '+374 XX XXX XXX'}
        </p>
      </div>
    </div>
    </CmsPageWrapper>
  );
}