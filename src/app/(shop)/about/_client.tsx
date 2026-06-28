'use client';

import { CmsPageWrapper } from '@/components/shared/CmsPageWrapper';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Truck, Award, Heart } from 'lucide-react';
import Link from '@/components/LocalizedLink';
import { useReveal, revealStyle } from '@/lib/motion';
import { useT } from '@/lib/i18n/admin';

const STATS = [
  { value: '2000+', label: 'pg.common.products' },
  { value: '5+', label: 'pg.about.stat.regions' },
  { value: '10,000+', label: 'pg.about.customers' },
  { value: '24/7', label: 'pg.about.stat.support' },
];

const VALUES = [
  { icon: Shield, title: 'pg.about.value.genuine.title', desc: 'pg.about.value.genuine.desc' },
  { icon: Award, title: 'pg.about.value.offers.title', desc: 'pg.about.value.offers.desc' },
  { icon: Truck, title: 'pg.about.value.delivery.title', desc: 'pg.about.value.delivery.desc' },
  { icon: Heart, title: 'pg.about.customers', desc: 'pg.about.value.customers.desc' },
];

function StatItem({ stat, index }: { stat: typeof STATS[number]; index: number }) {
  const { t } = useT();
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} style={revealStyle(visible, index * 0.1)} className="text-center">
      <p className="text-3xl font-black text-primary md:text-4xl">{stat.value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t(stat.label)}</p>
    </div>
  );
}

function ValueCard({ value, index }: { value: typeof VALUES[number]; index: number }) {
  const { t } = useT();
  const { ref, visible } = useReveal();
  const Icon = value.icon;
  return (
    <div ref={ref} style={revealStyle(visible, index * 0.1)}>
      <Card className="h-full transition-all hover:shadow-lg" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <CardContent className="flex gap-4 p-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-bold">{t(value.title)}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t(value.desc)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AboutPage() {
  const { t } = useT();
  return (
    <CmsPageWrapper slug="about">
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5" style={{ paddingBlock: 'var(--space-20)' }}>
        <div className="mx-auto text-center max-w-[var(--container-max)] px-[var(--space-container)]">
          <Badge variant="default" className="mb-4">{t('pg.about.badge')}</Badge>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            {t('pg.about.intro')}
          </p>
        </div>
      </section>

      <section className="border-y bg-muted/30" style={{ paddingBlock: 'var(--space-12)' }}>
        <div className="mx-auto grid grid-cols-2 gap-8 md:grid-cols-4 max-w-[var(--container-max)] px-[var(--space-container)]">
          {STATS.map((s, i) => <StatItem key={s.label} stat={s} index={i} />)}
        </div>
      </section>

      <section className="mx-auto max-w-[var(--container-max)] sm:px-[var(--space-container)] py-[var(--space-section)]">
        <h2 className="mb-10 text-center text-2xl font-bold">{t('pg.about.valuesTitle')}</h2>
        <div className="grid gap-6 md:grid-cols-2 px-4 sm:px-0">
          {VALUES.map((v, i) => <ValueCard key={v.title} value={v} index={i} />)}
        </div>
      </section>

      <section className="border-y bg-muted/40" style={{ paddingBlock: 'var(--space-16)' }}>
        <div className="mx-auto text-center max-w-[var(--container-max)] px-[var(--space-container)]">
          <h2 className="text-3xl font-bold">{t('pg.about.questionsTitle')}</h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">{t('pg.about.questionsDesc')}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/products"><Button size="lg" className="gap-2">{t('pg.common.products')}</Button></Link>
            <Link href="/contact"><Button size="lg" variant="outline">{t('pg.about.ctaContact')}</Button></Link>
          </div>
        </div>
      </section>
    </div>
    </CmsPageWrapper>
  );
}
