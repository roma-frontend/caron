'use client';

import { useRouter } from 'next/navigation';
import { numericInputProps } from '@/lib/utils';
import { useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Wizard, WizardStep, useWizardData } from '@/components/ui/wizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { useUpload } from '@/hooks/useUpload';
import { DatePicker } from '@/components/ui/DatePicker';
import { useRef } from 'react';
import Image from 'next/image';
import { PromoTemplateBuilder } from '@/components/admin/PromoTemplateBuilder';
import { defaultPromoConfig, type PromoTemplateConfig } from '@/components/PromoTemplate';
import { useAuthStore } from '@/store/auth';
import { useAdminT } from '@/lib/i18n/admin';

function StepInfo() {
  const { data, update } = useWizardData();
  const { t } = useAdminT();
  const { upload, uploading } = useUpload();
  const fileRef = useRef<HTMLInputElement>(null);
  const images = (data.images as string[]) ?? [];
  const handleImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    try {
      const urls: string[] = [];
      for (const f of files) { const url = await upload(f); if (url) urls.push(url); }
      update('images', [...images, ...urls]);
    } catch { toast.error('Error'); }
  };
  const removeImage = (i: number) => update('images', images.filter((_, idx) => idx !== i));
  const mode = (data.imageMode as string) ?? 'template';
  const config = (data.templateConfig as PromoTemplateConfig) ?? defaultPromoConfig();
  return (
    <div className="space-y-5">
      <div><Label>{t('acat.promoName')} *</Label><Input value={(data.title as string) ?? ''} onChange={(e) => update('title', e.target.value)} placeholder={t('acat.promoName')} className="h-11" /></div>
      <div><Label>{t('acat.promoDescription')}</Label><Textarea value={(data.description as string) ?? ''} onChange={(e) => update('description', e.target.value)} placeholder={t('acat.promoDescPlaceholder')} rows={3} /></div>
      <div><Label>{t('acat.discountPercent')}</Label><Input {...numericInputProps(false)} value={(data.discountPercent as number) ?? 10} onChange={(e) => update('discountPercent', Number(e.target.value))} className="h-11" /></div>

      <div>
        <Label>{t('acat.cardImage')}</Label>
        <div className="mt-2 mb-3 inline-flex rounded-lg border p-0.5 text-sm">
          <button type="button" onClick={() => update('imageMode', 'template')} className={`rounded-md px-3 py-1.5 transition-colors ${mode === 'template' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{t('acat.template')}</button>
          <button type="button" onClick={() => update('imageMode', 'upload')} className={`rounded-md px-3 py-1.5 transition-colors ${mode === 'upload' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{t('acat.images')}</button>
        </div>

        {mode === 'template' ? (
          <PromoTemplateBuilder value={config} onChange={(c) => update('templateConfig', c)} />
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {images.map((img, i) => (
              <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
                <Image src={img} alt="" width={200} height={200} className="h-full w-full object-cover" />
                <button onClick={() => removeImage(i)} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 text-[10px]">✕</button>
              </div>
            ))}
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary">
              <ImagePlus className="h-6 w-6" />
            </button>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImages} />
      </div>
    </div>
  );
}

function StepDates() {
  const { data, update } = useWizardData();
  const { t } = useAdminT();
  return (
    <div className="space-y-5">
      <div><Label>{t('acat.start')} *</Label><DatePicker value={(data.startDate as string) ?? ''} onChange={(v) => update('startDate', v)} /></div>
      <div><Label>{t('acat.end')} *</Label><DatePicker value={(data.endDate as string) ?? ''} onChange={(v) => update('endDate', v)} /></div>
    </div>
  );
}

export default function AddPromotionPage() {
  const router = useRouter();
  const create = useMutation(api.promotions.create);
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const { t } = useAdminT();

  const steps: WizardStep[] = [
    { id: 'info', title: t('acat.promoInfo'), content: <StepInfo />, validation: (d) => !!(d.title) },
    { id: 'dates', title: t('acat.dates'), content: <StepDates />, validation: (d) => !!(d.startDate && d.endDate) },
  ];

  const handleComplete = async (data: Record<string, unknown>) => {
    const images = (data.images as string[]) ?? [];
    const useTemplate = (data.imageMode as string ?? 'template') === 'template';
    const config = data.templateConfig as PromoTemplateConfig | undefined;
    await create({
      sessionToken: sessionToken!,
      title: data.title as string,
      description: (data.description as string) || undefined,
      discountPercent: Number(data.discountPercent) || undefined,
      templateJson: useTemplate && config ? JSON.stringify(config) : undefined,
      imageUrl: !useTemplate ? (images[0] || undefined) : undefined,
      images: !useTemplate && images.length > 0 ? images : undefined,
      startDate: new Date(data.startDate as string).getTime(),
      endDate: new Date(data.endDate as string).getTime(),
      isActive: true,
    });
    toast.success(t('acat.promoCreated'));
    router.push('/admin/promotions');
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-2xl overflow-hidden rounded-2xl border-0" style={{ boxShadow: 'var(--shadow-xl)' }}>
        <Wizard steps={steps} onComplete={handleComplete} onCancel={() => router.push('/admin/promotions')} submitLabel={t('acat.add')} />
      </Card>
    </div>
  );
}
