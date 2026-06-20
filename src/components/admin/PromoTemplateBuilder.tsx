'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  PromoTemplate, PROMO_TEMPLATES, PROMO_COLOR_LIST, PROMO_COLORS,
  type PromoTemplateConfig,
} from '@/components/PromoTemplate';

/** Admin builder: pick a template + color, edit the text, see a live preview. */
export function PromoTemplateBuilder({ value, onChange }: {
  value: PromoTemplateConfig;
  onChange: (next: PromoTemplateConfig) => void;
}) {
  const set = (patch: Partial<PromoTemplateConfig>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Live preview */}
        <div className="mx-auto aspect-square w-44 shrink-0 overflow-hidden rounded-2xl border shadow-sm sm:mx-0">
          <PromoTemplate config={value} />
        </div>
        {/* Text fields */}
        <div className="flex-1 space-y-3">
          <div>
            <Label className="text-xs">Մեծ տեքստ (օր.՝ -30%, 2+1)</Label>
            <Input value={value.headline} onChange={(e) => set({ headline: e.target.value })} placeholder="-30%" className="h-10" />
          </div>
          <div>
            <Label className="text-xs">Վերնագիր</Label>
            <Input value={value.title} onChange={(e) => set({ title: e.target.value })} placeholder="Կոճակների զեղչ" className="h-10" />
          </div>
          <div>
            <Label className="text-xs">Ենթավերնագիր</Label>
            <Input value={value.subtitle ?? ''} onChange={(e) => set({ subtitle: e.target.value })} placeholder="Brembo, TRW, ATE" className="h-10" />
          </div>
          <div>
            <Label className="text-xs">Ստորին նշում</Label>
            <Input value={value.footnote ?? ''} onChange={(e) => set({ footnote: e.target.value })} placeholder="Սահմանափակ առաջարկ" className="h-10" />
          </div>
        </div>
      </div>

      {/* Template picker */}
      <div>
        <Label className="text-xs">Շաբլոն</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {PROMO_TEMPLATES.map((t) => (
            <button key={t.id} type="button" onClick={() => set({ id: t.id })}
              className={`overflow-hidden rounded-lg border-2 transition-colors ${value.id === t.id ? 'border-primary' : 'border-transparent hover:border-primary/40'}`}
              title={t.label}>
              <div className="h-16 w-16">
                <PromoTemplate config={{ ...value, id: t.id }} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div>
        <Label className="text-xs">Գույն</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {PROMO_COLOR_LIST.map((color) => {
            const p = PROMO_COLORS[color];
            return (
              <button key={color} type="button" onClick={() => set({ color })} aria-label={color}
                className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${value.color === color ? 'border-foreground ring-2 ring-primary/30' : 'border-white/40'}`}
                style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }} />
            );
          })}
        </div>
      </div>
    </div>
  );
}
