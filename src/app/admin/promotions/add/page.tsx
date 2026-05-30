'use client';

import { useRouter } from 'next/navigation';
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
import { useRef } from 'react';
import Image from 'next/image';
import { useAuthStore } from '@/store/auth';

function StepInfo() {
  const { data, update } = useWizardData();
  const { upload, uploading } = useUpload();
  const fileRef = useRef<HTMLInputElement>(null);
  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; try { const url = await upload(file); update('imageUrl', url); } catch { toast.error('Error'); } };
  return (
    <div className="space-y-5">
      <div><Label>Ակցիայի անուն *</Label><Input value={(data.title as string) ?? ''} onChange={(e) => update('title', e.target.value)} placeholder="Ակցիայի անուն" className="h-11" /></div>
      <div><Label>Ակցիայի նկարագրություն</Label><Textarea value={(data.description as string) ?? ''} onChange={(e) => update('description', e.target.value)} placeholder="Ակցիայի նկարագրություն..." rows={3} /></div>
      <div><Label>Զեղչ (%)</Label><Input type="number" value={(data.discountPercent as number) ?? 10} onChange={(e) => update('discountPercent', Number(e.target.value))} className="h-11" /></div>
      <div>
        <Label>Պատկեր</Label>
        {data.imageUrl ? (
          <div className="relative mt-2 aspect-video overflow-hidden rounded-lg border">
            <Image src={data.imageUrl as string} alt="" width={600} height={200} className="h-full w-full object-cover" />
            <button onClick={() => update('imageUrl', '')} className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white text-xs">✕</button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-muted-foreground hover:border-primary hover:text-primary">
            <ImagePlus className="h-5 w-5" /> {uploading ? '...' : 'Ներբեռնել պատկեր'}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
      </div>
    </div>
  );
}

function StepDates() {
  const { data, update } = useWizardData();
  return (
    <div className="space-y-5">
      <div><Label>Սկիզբ *</Label><Input type="date" value={(data.startDate as string) ?? ''} onChange={(e) => update('startDate', e.target.value)} className="h-11" /></div>
      <div><Label>Ավարտ *</Label><Input type="date" value={(data.endDate as string) ?? ''} onChange={(e) => update('endDate', e.target.value)} className="h-11" /></div>
    </div>
  );
}

export default function AddPromotionPage() {
  const router = useRouter();
  const create = useMutation(api.promotions.create);
  const sessionToken = useAuthStore((s) => s.sessionToken);

  const steps: WizardStep[] = [
    { id: 'info', title: 'Ակցիայի տվյալներ', content: <StepInfo />, validation: (d) => !!(d.title) },
    { id: 'dates', title: 'Ամսաթիվներ', content: <StepDates />, validation: (d) => !!(d.startDate && d.endDate) },
  ];

  const handleComplete = async (data: Record<string, unknown>) => {
    await create({
      sessionToken: sessionToken!,
      title: data.title as string,
      description: (data.description as string) || undefined,
      discountPercent: Number(data.discountPercent) || undefined,
      imageUrl: (data.imageUrl as string) || undefined,
      startDate: new Date(data.startDate as string).getTime(),
      endDate: new Date(data.endDate as string).getTime(),
      isActive: true,
    });
    toast.success('Ակցիան հաջողությամբ ստեղծվեց');
    router.push('/admin/promotions');
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-2xl overflow-hidden rounded-2xl border-0" style={{ boxShadow: 'var(--shadow-xl)' }}>
        <Wizard steps={steps} onComplete={handleComplete} onCancel={() => router.push('/admin/promotions')} submitLabel="Ավելացնել" />
      </Card>
    </div>
  );
}
