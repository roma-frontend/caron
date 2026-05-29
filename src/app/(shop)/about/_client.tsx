'use client';

import { CmsPageWrapper } from '@/components/shared/CmsPageWrapper';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Truck, Award, Heart, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useReveal, revealStyle } from '@/lib/motion';

const STATS = [
  { value: '2000+', label: 'Ապրանքներ' },
  { value: '5+', label: 'Տարածքներ' },
  { value: '10,000+', label: 'Հաճախորդներ' },
  { value: '24/7', label: 'Աջակցություն' },
];

const VALUES = [
  { icon: Shield, title: 'Անվավեր ապրանքներ', desc: 'Մենք պատասխանատու ենք անվավեր ապրանքների համար' },
  { icon: Award, title: 'Առաջարկներ', desc: 'Մենք առաջարկում ենք ամենալավ գները և ծառայությունը' },
  { icon: Truck, title: 'Առաքում', desc: 'Մենք առաքում ենք ապրանքները ամեն օր' },
  { icon: Heart, title: 'Հաճախորդներ', desc: 'Մենք հաճախորդների հետ կապվում ենք և օգտագործում ենք դրանց հետ' },
];

function StatItem({ stat, index }: { stat: typeof STATS[number]; index: number }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} style={revealStyle(visible, index * 0.1)} className="text-center">
      <p className="text-3xl font-black text-primary md:text-4xl">{stat.value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
    </div>
  );
}

function ValueCard({ value, index }: { value: typeof VALUES[number]; index: number }) {
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
            <h3 className="font-bold">{value.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{value.desc}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AboutPage() {
  return (
    <CmsPageWrapper slug="about">
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5" style={{ paddingBlock: 'var(--space-20)' }}>
        <div className="mx-auto text-center" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)' }}>
          <Badge variant="default" className="hero-fade-1 mb-4">Մեր մասին</Badge>
          <p className="hero-fade-3 mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Բարի գալուստ մեր կայք։ Մենք ուրախ ենք տրամադրել բարձրորակ ավտոպահեստամասեր և գերազանց ծառայություն մեր հաճախորդներին Հայաստանում։ Մեր առաքելությունն է ապահովել, որ ձեր մեքենան միշտ պատրաստ լինի ճանապարհին լինելու համար՝ առաջարկելով լայն տեսականի ապրանքներ և անհատականացված աջակցություն։
          </p>
        </div>
      </section>

      <section className="border-y bg-muted/30" style={{ paddingBlock: 'var(--space-12)' }}>
        <div className="mx-auto grid grid-cols-2 gap-8 md:grid-cols-4" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)' }}>
          {STATS.map((s, i) => <StatItem key={s.label} stat={s} index={i} />)}
        </div>
      </section>

      <section className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-section)' }}>
        <h2 className="mb-10 text-center text-2xl font-bold">Մեր արժեքներ</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {VALUES.map((v, i) => <ValueCard key={v.title} value={v} index={i} />)}
        </div>
      </section>

      <section className="bg-primary text-white" style={{ paddingBlock: 'var(--space-16)' }}>
        <div className="mx-auto text-center" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)' }}>
          <h2 className="text-3xl font-bold">Ունե ՞ք հարցեր</h2>
          <p className="mx-auto mt-3 max-w-lg text-white/80">Հարցերի և առաջարկների դեպքում կարող եք կապ հաստատել մեզ հետ</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/products"><Button size="lg" className="gap-2 bg-white text-white hover:bg-white/90 font-bold">Ապրանքներ</Button></Link>
            <Link href="/contact"><Button size="lg" variant="outline" className="border-white/30 text-black hover:bg-white/90">Կապ հաստատել</Button></Link>
          </div>
        </div>
      </section>
    </div>
    </CmsPageWrapper>
  );
}
