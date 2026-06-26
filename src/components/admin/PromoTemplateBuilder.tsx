'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useT } from '@/lib/i18n/admin';
import {
  PromoTemplate, PROMO_TEMPLATES, PROMO_COLOR_LIST, PROMO_COLORS,
  PROMO_RATIOS, PROMO_RATIO_CLASS,
  type PromoTemplateConfig,
} from '@/components/PromoTemplate';

/** Admin builder: pick a template + ratio + color, edit the text, live preview. */
export function PromoTemplateBuilder({ value, onChange }: {
  value: PromoTemplateConfig;
  onChange: (next: PromoTemplateConfig) => void;
}) {
  const { t } = useT();
  const set = (patch: Partial<PromoTemplateConfig>) => onChange({ ...value, ...patch });
  const cardRatio = value.cardRatio ?? '1/1';
  const bannerRatio = value.bannerRatio ?? '16/5';

  return (
    <div className="space-y-4">
      {/* Dual preview: /promotions card + homepage banner */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="text-xs">{t('acmp.promo.previewCard')}</Label>
          <div className={`mt-2 mx-auto w-44 overflow-hidden rounded-2xl border shadow-sm ${PROMO_RATIO_CLASS[cardRatio]}`}>
            <PromoTemplate config={value} ratio={cardRatio} />
          </div>
        </div>
        <div>
          <Label className="text-xs">{t('acmp.promo.previewBanner')}</Label>
          <div className={`mt-2 w-full overflow-hidden rounded-2xl border shadow-sm ${PROMO_RATIO_CLASS[bannerRatio]}`}>
            <PromoTemplate config={value} ratio={bannerRatio} />
          </div>
        </div>
      </div>

      {/* Text fields */}
      <div className="space-y-3">
        <div>
          <Label className="text-xs">{t('acmp.promo.bigText')}</Label>
          <Input value={value.headline} onChange={(e) => set({ headline: e.target.value })} placeholder="-30%" className="h-10" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">{t('acmp.promo.title')}</Label>
            <Input value={value.title} onChange={(e) => set({ title: e.target.value })} placeholder={t('acmp.promo.titlePlaceholder')} className="h-10" />
          </div>
          <div>
            <Label className="text-xs">{t('acmp.promo.subtitle')}</Label>
            <Input value={value.subtitle ?? ''} onChange={(e) => set({ subtitle: e.target.value })} placeholder="Brembo, TRW, ATE" className="h-10" />
          </div>
        </div>
        <div>
          <Label className="text-xs">{t('acmp.promo.footnote')}</Label>
          <Input value={value.footnote ?? ''} onChange={(e) => set({ footnote: e.target.value })} placeholder={t('acmp.promo.footnotePlaceholder')} className="h-10" />
        </div>
      </div>

      {/* Card ratio (for /promotions) */}
      <div>
        <Label className="text-xs">{t('acmp.promo.cardShape')}</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {PROMO_RATIOS.map((r) => (
            <button key={r.value} type="button" onClick={() => set({ cardRatio: r.value })}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${cardRatio === r.value ? 'border-primary bg-primary/10 text-primary' : 'hover:border-primary/40'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Banner ratio (for homepage) */}
      <div>
        <Label className="text-xs">{t('acmp.promo.bannerShape')}</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {PROMO_RATIOS.map((r) => (
            <button key={r.value} type="button" onClick={() => set({ bannerRatio: r.value })}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${bannerRatio === r.value ? 'border-primary bg-primary/10 text-primary' : 'hover:border-primary/40'}`}>
              {r.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
          {t('acmp.promo.shapeHint')}
        </p>
      </div>

      {/* Template picker (square thumbnails) */}
      <div>
        <Label className="text-xs">{t('acmp.promo.template')}</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {PROMO_TEMPLATES.map((tpl) => (
            <button key={tpl.id} type="button" onClick={() => set({ id: tpl.id })}
              className={`overflow-hidden rounded-lg border-2 transition-colors ${value.id === tpl.id ? 'border-primary' : 'border-transparent hover:border-primary/40'}`}
              title={tpl.label}>
              <div className="h-16 w-16">
                <PromoTemplate config={{ ...value, id: tpl.id }} ratio="1/1" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div>
        <Label className="text-xs">{t('acmp.promo.color')}</Label>
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
