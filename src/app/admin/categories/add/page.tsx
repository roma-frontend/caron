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

function StepBasicInfo() {
  const { data, update } = useWizardData();
  const { upload, uploading } = useUpload();
  const fileRef = useRef<HTMLInputElement>(null);
  const handleImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try { const url = await upload(f); update('imageUrl', url); } catch { toast.error('Error'); }
  };

  return (
    <div className="space-y-5">
      <div><Label>Կատեգորիա *</Label><Input value={(data.name as string) ?? ''} onChange={(e) => { update('name', e.target.value); update('slug', e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')); }} placeholder="Կատեգորիա" className="h-11" /></div>
      <div><Label>Slug</Label><Input value={(data.slug as string) ?? ''} onChange={(e) => update('slug', e.target.value)} placeholder="category-slug" className="h-11 font-mono" /></div>
      <div><Label>Նկարագրություն</Label><Textarea value={(data.description as string) ?? ''} onChange={(e) => update('description', e.target.value)} placeholder="Կատեգորիայի նկարագրություն" rows={3} /></div>
      <div>
        <Label>Պատկեր</Label>
        {data.imageUrl ? (
          <div className="relative mt-2 aspect-video overflow-hidden rounded-lg border">
            <Image src={data.imageUrl as string} alt="" className="h-full w-full object-cover" />
            <button onClick={() => update('imageUrl', '')} className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white text-xs">✕</button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-muted-foreground hover:border-primary hover:text-primary">
            <ImagePlus className="h-5 w-5" /> {uploading ? '...' : 'Ներբեռնել պատկեր'}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImg} />
      </div>
    </div>
  );
}

function StepSEO() {
  const { data, update } = useWizardData();
  return (
    <div className="space-y-5">
      <div><Label>SEO նկարագրություն</Label><Input value={(data.seoTitle as string) ?? ''} onChange={(e) => update('seoTitle', e.target.value)} className="h-11" /></div>
      <div><Label>SEO նկարագրություն</Label><Textarea value={(data.seoDescription as string) ?? ''} onChange={(e) => update('seoDescription', e.target.value)} rows={3} /></div>
      <div><Label>Ակցիա</Label><Input value={(data.order as string) ?? '0'} onChange={(e) => update('order', e.target.value)} type="number" className="h-11" /></div>
    </div>
  );
}

export default function AddCategoryPage() {
  const router = useRouter();
  const create = useMutation(api.categories.create);

  const steps: WizardStep[] = [
    { id: 'basic', title: 'Սկզբնական տվյալներ', content: <StepBasicInfo />, validation: (d) => !!(d.name && d.slug) },
    { id: 'seo', title: 'SEO', content: <StepSEO /> },
  ];

  const handleComplete = async (data: Record<string, unknown>) => {
    await create({
      name: data.name as string,
      slug: data.slug as string,
      description: (data.description as string) || undefined,
      imageUrl: (data.imageUrl as string) || undefined,
      order: Number(data.order) || 0,
      isActive: true,
      seoTitle: (data.seoTitle as string) || undefined,
      seoDescription: (data.seoDescription as string) || undefined,
    });
    toast.success('Կատեգորիան հաջողությամբ ստեղծվեց');
    router.push('/admin/categories');
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-2xl overflow-hidden rounded-2xl border-0" style={{ boxShadow: 'var(--shadow-xl)' }}>
        <Wizard steps={steps} onComplete={handleComplete} onCancel={() => router.push('/admin/categories')} submitLabel="Ստեղծել" />
      </Card>
    </div>
  );
}
