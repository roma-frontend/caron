'use client';

import { useQuery, useMutation } from 'convex/react';
import { useRouter } from 'next/navigation';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, FolderTree } from 'lucide-react';
import { toast } from 'sonner';
import { Id } from '../../../../convex/_generated/dataModel';
import Link from 'next/link';
import { useReveal, revealStyle } from '@/lib/motion';

const ICONS: Record<string, string> = { tires: '🛞', oils: '🛢️', filters: '🔧', brakes: '🚗', lamps: '💡', batteries: '🔋' };

function AdminCategoryCard({ cat, index }: { cat: { _id: Id<'categories'>; name: string; slug: string; description?: string; isActive: boolean }; index: number }) {
  const { ref, visible } = useReveal();
  const remove = useMutation(api.categories.remove);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`Ջնջել "${cat.name}"?`)) return;
    await remove({ id: cat._id });
    toast.success('Կատեգորիան ջնջվել է');
  };

  return (
    <div ref={ref} style={revealStyle(visible, index * 0.06)}>
      <div className="group relative overflow-hidden rounded-xl border bg-background transition-all hover:shadow-lg" style={{ boxShadow: 'var(--shadow-xs)' }}>
        <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button size="icon-sm" variant="secondary" className="h-7 w-7 shadow-md" onClick={() => router.push(`/admin/categories/${cat._id}/edit`)}><Edit className="h-3 w-3" /></Button>
          <Button size="icon-sm" variant="destructive" className="h-7 w-7 shadow-md" onClick={handleDelete}><Trash2 className="h-3 w-3" /></Button>
        </div>
        <div className="flex flex-col items-center p-6 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
            {ICONS[cat.slug] ?? '📁'}
          </div>
          <h3 className="font-semibold">{cat.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground font-mono">/{cat.slug}</p>
          {cat.description && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{cat.description}</p>}
          <Badge variant={cat.isActive ? 'default' : 'secondary'} className="mt-3 text-[10px]">{cat.isActive ? 'Ակտիվ' : 'Ակտիվ չէ'}</Badge>
        </div>
      </div>
    </div>
  );
}

export default function AdminCategoriesPage() {
  const categories = useQuery(api.categories.list, {});

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Կատեգորիաներ</h1>
          <p className="text-muted-foreground">{categories?.length ?? 0} կատեգորիաներ</p>
        </div>
        <Link href="/admin/categories/add">
          <Button className="gap-2"><Plus className="h-4 w-4" /> Ավելացնել կատեգորիա</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {categories?.map((cat, i) => <AdminCategoryCard key={cat._id} cat={cat} index={i} />)}
      </div>

      {categories?.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <FolderTree className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground">Կատեգորիաներ չեն գտնվել</p>
          <Link href="/admin/categories/add"><Button>Ավելացնել կատեգորիա</Button></Link>
        </div>
      )}
    </div>
  );
}
