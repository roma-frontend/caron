'use client';

import { Card, CardContent } from '@/components/ui/card';
import { RotateCcw, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { useT } from '@/lib/i18n/admin';

export function ReturnsContent() {
  const { t } = useT();

  const RULES = [
    { icon: Clock, title: t('misc.retDeadlinesTitle'), items: [t('misc.retDeadline1'), t('misc.retDeadline2'), t('misc.retDeadline3')] },
    { icon: CheckCircle, title: t('misc.retCanTitle'), items: [t('misc.retCan1'), t('misc.retCan2'), t('misc.retCan3')] },
    { icon: AlertTriangle, title: t('misc.retCannotTitle'), items: [t('misc.retCannot1'), t('misc.retCannot2'), t('misc.retCannot3')] },
  ];

  const STEPS = [
    { step: 1, text: t('misc.retStep1') },
    { step: 2, text: t('misc.retStep2') },
    { step: 3, text: t('misc.retStep3') },
    { step: 4, text: t('misc.retStep4') },
  ];

  return (
    <div
      className="mx-auto"
      style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-8)' }}
    >
      <div className="mb-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <RotateCcw className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-4xl font-bold">{t('misc.returnsTitle')}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{t('misc.returnsSubtitle')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {RULES.map((rule) => (
          <Card key={rule.title}>
            <CardContent className="p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <rule.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-3 text-lg font-bold">{rule.title}</h3>
              <ul className="space-y-2">
                {rule.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12">
        <h2 className="mb-6 text-center text-2xl font-bold">{t('misc.returnsProcedure')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.step} className="flex items-start gap-3 rounded-xl border p-5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                {s.step}
              </div>
              <p className="text-sm">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
