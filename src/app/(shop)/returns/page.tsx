import type { Metadata } from 'next';
import { Card, CardContent } from '@/components/ui/card';
import {
  RotateCcw,
  Clock,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Վերադարձ և փոխանակում',
  description: 'Ապրանքների վերադարձի և փոխանակման պայմաններ',
};

const RULES = [
  {
    icon: Clock,
    title: 'Վերադարձի ժամկետներ',
    items: [
      'Վերադարձը հնարավոր է 14 օրվա ընթացքում',
      'Հաշվարկը կատարվում է առաքման օրվանից',
      'Գումարը վերադարձվում է 3-5 աշխատանքային օրվա ընթացքում',
    ],
  },

  {
    icon: CheckCircle,
    title: 'Կարելի է վերադարձնել',
    items: [
      'Ապրանքը չի օգտագործվել',
      'Պահպանվել է փաթեթավորումը',
      'Ապրանքը չի համապատասխանում մեքենային',
    ],
  },

  {
    icon: AlertTriangle,
    title: 'Չի կարելի վերադարձնել',
    items: [
      'Ապրանքը տեղադրվել է',
      'Վնասվել է փաթեթավորումը',
      'Անցել է 14 օրից ավելի',
    ],
  },
];

const STEPS = [
  {
    step: 1,
    text: 'Կապվեք մեզ հետ հեռախոսով կամ էլ. փոստով',
  },

  {
    step: 2,
    text: 'Նշեք պատվերի համարը և վերադարձի պատճառը',
  },

  {
    step: 3,
    text: 'Ուղարկեք ապրանքը մեր խանութ կամ սուրհանդակով',
  },

  {
    step: 4,
    text: 'Ստացեք գումարի վերադարձը 3-5 օրվա ընթացքում',
  },
];

export default function ReturnsPage() {
  return (
    <div
      className="mx-auto"
      style={{
        maxWidth: 'var(--container-max)',
        paddingInline: 'var(--space-container)',
        paddingBlock: 'var(--space-8)',
      }}
    >
      <div className="mb-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <RotateCcw className="h-7 w-7 text-primary" />
        </div>

        <h1 className="text-4xl font-bold">
          Վերադարձ և փոխանակում
        </h1>

        <p className="mt-3 text-lg text-muted-foreground">
          Մեր վերադարձի և փոխանակման պայմանները
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {RULES.map((rule) => (
          <Card key={rule.title}>
            <CardContent className="p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <rule.icon className="h-5 w-5 text-primary" />
              </div>

              <h3 className="mb-3 text-lg font-bold">
                {rule.title}
              </h3>

              <ul className="space-y-2">
                {rule.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
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
        <h2 className="mb-6 text-center text-2xl font-bold">
          Ընթացակարգը
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div
              key={s.step}
              className="flex items-start gap-3 rounded-xl border p-5"
            >
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