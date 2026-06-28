'use client';

import { useParams, useRouter } from 'next/navigation';
import { numericInputProps } from '@/lib/utils';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../../convex/_generated/api';
import { Id } from '../../../../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, ArrowLeft, ImagePlus } from 'lucide-react';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { useUpload } from '@/hooks/useUpload';
import Link from '@/components/LocalizedLink';
import Image from 'next/image';
import { useAuth } from '@/store/auth';
import { useAdminT } from '@/lib/i18n/admin';

export default function EditCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.id as Id<'categories'>;
  const categories = useQuery(api.categories.list, {});
  const update = useMutation(api.categories.update);
  const { sessionToken } = useAuth();
  const { t } = useAdminT();
  const { upload, uploading } = useUpload();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', description: '', seoTitle: '', seoDescription: '', order: 0, imageUrl: '' });
  const [loaded, setLoaded] = useState(false);

  const cat = categories?.find((c) => c._id === categoryId);

  if (cat && !loaded) {
    setForm({ name: cat.name, slug: cat.slug, description: cat.description ?? '', seoTitle: cat.seoTitle ?? '', seoDescription: cat.seoDescription ?? '', order: cat.order, imageUrl: cat.imageUrl ?? '' });
    setLoaded(true);
  }

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { const url = await upload(file); if (url) setForm({ ...form, imageUrl: url }); } catch { toast.error(t('acat.uploadFailed')); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await update({ sessionToken: sessionToken ?? '', id: categoryId, name: form.name, slug: form.slug, description: form.description || undefined, seoTitle: form.seoTitle || undefined, seoDescription: form.seoDescription || undefined, order: form.order, imageUrl: form.imageUrl || undefined });
      toast.success(t('acat.catSaved'));
      router.push('/admin/categories');
    } catch { toast.error(t('acat.catSaveFailed')); } finally { setSaving(false); }
  };

  if (!cat) return <div className="py-16 text-center">{t('acat.catNotFound')}</div>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/categories"><Button variant="ghost" size="icon-sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold">{t('acat.editCategory')}</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>{t('acat.editCategory')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>{t('acat.name')}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11" /></div>
          <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="h-11 font-mono" /></div>
          <div><Label>{t('acat.description')}</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
          <div><Label>{t('acat.seoName')}</Label><Input value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} className="h-11" /></div>
          <div><Label>{t('acat.seoDesc')}</Label><Textarea value={form.seoDescription} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} rows={2} /></div>
          <div><Label>{t('acat.order')}</Label><Input {...numericInputProps(false)} value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} className="h-11" /></div>
          <div>
            <Label>{t('acat.image')}</Label>
            {form.imageUrl ? (
              <div className="relative mt-2 aspect-video overflow-hidden rounded-lg border">
                <Image src={form.imageUrl} alt="" width={300} height={300} className="h-full w-full object-cover" />
                <button onClick={() => setForm({ ...form, imageUrl: '' })} className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white text-xs">✕</button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-muted-foreground hover:border-primary hover:text-primary">
                <ImagePlus className="h-5 w-5" /> {uploading ? '...' : t('acat.uploadImage')}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
          </div>
          <Button onClick={handleSave} disabled={saving} size="lg" className="w-full gap-2">
            <Save className="h-4 w-4" /> {saving ? t('acat.saving') : t('acat.save')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
