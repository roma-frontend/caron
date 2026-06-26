'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Edit, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { useAdminT } from '@/lib/i18n/admin';

export default function AdminPagesPage() {
  const pages = useQuery(api.pages.list) ?? [];
  const remove = useMutation(api.pages.remove);
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const { t } = useAdminT();

  const handleDelete = async (id: typeof pages[number]['_id'], title: string) => {
    if (!confirm(`${t('acat.delete')} "${title}"?`)) return;
    await remove({ id, sessionToken: sessionToken! });
    toast.success(t('acat.pageDeleted'));
  };

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold">{t('acat.pages')}</h1>
          <p className="text-sm text-muted-foreground">{t('acat.pagesSubtitle')}</p>
        </div>
        <Link href="/admin/pages/new/edit">
          <Button><Plus className="mr-2 h-4 w-4" /> {t('acat.newPage')}</Button>
        </Link>
      </div>

      <div className="space-y-2">
        {pages.length === 0 && (
          <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
            <FileText className="mx-auto mb-3 h-10 w-10 opacity-50" />
            <p>{t('acat.noPages')}</p>
          </div>
        )}
        {pages.map((page) => (
          <div key={page._id} className="flex items-center justify-between rounded-xl border bg-background p-4 transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{page.title}</p>
                <p className="text-xs text-muted-foreground">/{page.slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={page.isPublished ? 'default' : 'secondary'}>
                {page.isPublished ? t('acat.published') : t('acat.draft')}
              </Badge>
              <Link href={`/admin/pages/${page.slug}/edit`}>
                <Button size="icon" variant="ghost"><Edit className="h-4 w-4" /></Button>
              </Link>
              <Button size="icon" variant="ghost" onClick={() => handleDelete(page._id, page.title)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
