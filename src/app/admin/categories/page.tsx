'use client';

import { useQuery, useMutation } from 'convex/react';
import { useRouter } from 'next/navigation';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, FolderTree, Package } from 'lucide-react';
import { toast } from 'sonner';
import { Id } from '../../../../convex/_generated/dataModel';
import Link from 'next/link';
import { useReveal, revealStyle } from '@/lib/motion';
import { useAuth } from '@/store/auth';
import { CATEGORY_ICONS, CATEGORY_COLORS } from '@/components/cards/CategoryCard';

function AdminCategoryCard({ cat, sessionToken, index }: { cat: { _id: Id<'categories'>; name: string; slug: string; description?: string; isActive: boolean }; sessionToken: string; index: number }) {
  const { ref, visible } = useReveal();
  const remove = useMutation(api.categories.remove);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`Ջնջել "${cat.name}"?`)) return;
    await remove({ sessionToken, id: cat._id });
    toast.success('Կատեգորիան ջնջվել է');
  };

  const Icon = CATEGORY_ICONS[cat.slug] ?? Package;
  const color = CATEGORY_COLORS[cat.slug] ?? 'bg-primary/10 text-primary';

  return (
    <div ref={ref} style={revealStyle(visible, index * 0.06)}>
      <div className="group relative flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${color}`}>
          <Icon className="h-7 w-7" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{cat.name}</h3>
          <p className="truncate font-mono text-xs text-muted-foreground">/{cat.slug}</p>
          <Badge variant={cat.isActive ? 'default' : 'secondary'} className="mt-1.5 text-[10px]">{cat.isActive ? 'Ակտիվ' : 'Ակտիվ չէ'}</Badge>
        </div>
        <div className="flex shrink-0 flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button size="icon-sm" variant="secondary" className="h-7 w-7 shadow-md" onClick={() => router.push(`/admin/categories/${cat._id}/edit`)}><Edit className="h-3 w-3" /></Button>
          <Button size="icon-sm" variant="destructive" className="h-7 w-7 shadow-md" onClick={handleDelete}><Trash2 className="h-3 w-3" /></Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCategoriesPage() {
  const { sessionToken } = useAuth();
  const categories = useQuery(api.categories.list, {});

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold">Կատեգորիաներ</h1>
          <p className="text-muted-foreground">{categories?.length ?? 0} կատեգորիաներ</p>
        </div>
        <Link href="/admin/categories/add">
          <Button className="gap-2"><Plus className="h-4 w-4" /> Ավելացնել կատեգորիա</Button>
        </Link>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {categories?.map((cat, i) => <AdminCategoryCard key={cat._id} cat={cat} sessionToken={sessionToken ?? ''} index={i} />)}
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
