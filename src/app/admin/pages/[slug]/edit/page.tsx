'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/store/auth';

const RichEditor = dynamic(() => import('@/components/admin/RichEditor'), { ssr: false });

export default function EditPagePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const isNew = slug === 'new';
  const page = useQuery(api.pages.getBySlug, isNew ? 'skip' : { slug });
  const save = useMutation(api.pages.save);
  const sessionToken = useAuthStore((s) => s.sessionToken);

  if (!isNew && page === undefined) return <div className="p-8 text-center text-muted-foreground">Բեռնվում է...</div>;
  if (!isNew && page === null) return <div className="p-8 text-center text-muted-foreground">Էջը չի գտնվել</div>;

  return <EditForm key={page?._id ?? 'new'} page={page} isNew={isNew} save={save} router={router} sessionToken={sessionToken} />;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EditForm({ page, isNew, save, router, sessionToken }: { page: any; isNew: boolean; save: any; router: any; sessionToken?: string | null }) {
  const [title, setTitle] = useState(page?.title ?? '');
  const [pageSlug, setPageSlug] = useState(page?.slug ?? '');
  const [content, setContent] = useState(page?.content ?? '');
  const [isPublished, setIsPublished] = useState(page?.isPublished ?? true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !pageSlug.trim()) {
      toast.error('Լրացրեք վերնագիրը և slug-ը');
      return;
    }
    setSaving(true);
    try {
      await save({
        sessionToken: sessionToken!,
        id: page?._id,
        title: title.trim(),
        slug: pageSlug.trim(),
        content,
        isPublished,
      });
      toast.success('Էջը պահպանվել է');
      if (isNew) router.push('/admin/pages');
    } catch {
      toast.error('Սխալ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/pages">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold">{isNew ? 'Նոր էջ' : 'Խմբագրել'}</h1>
      </div>

      <div className="space-y-4 rounded-xl border bg-background p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Վերնագիր</Label>
            <Input value={title} onChange={(e) => { setTitle(e.target.value); if (isNew && !page) setPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')); }} placeholder="Էջի վերնագիրը" />
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={pageSlug} onChange={(e) => setPageSlug(e.target.value)} placeholder="page-slug" />
          </div>
        </div>

        <div>
          <Label>Բովանդակություն</Label>
          <RichEditor value={content} onChange={setContent} />
        </div>

        <div className="flex items-center gap-2">
          <Switch checked={isPublished} onCheckedChange={setIsPublished} />
          <Label>Հրապարակված</Label>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" /> {saving ? 'Պահպանվում...' : 'Պահպանել'}
        </Button>
      </div>
    </div>
  );
}
