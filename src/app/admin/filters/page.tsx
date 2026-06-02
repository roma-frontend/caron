'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Edit, SlidersHorizontal, AlertTriangle, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/store/auth';
import type { Id } from '../../../../convex/_generated/dataModel';

export default function AdminFiltersPage() {
  const { sessionToken } = useAuth();
  const filters = useQuery(api.filters.listAll, sessionToken ? { sessionToken } : 'skip');
  const categories = useQuery(api.categories.list, {});
  const createFilter = useMutation(api.filters.create);
  const updateFilter = useMutation(api.filters.update);
  const removeFilter = useMutation(api.filters.remove);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<'filterDefinitions'> | null>(null);
  const [deleteId, setDeleteId] = useState<Id<'filterDefinitions'> | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', categoryId: '' as string, options: '', order: 0 });

  const resetForm = () => setForm({ name: '', slug: '', categoryId: '', options: '', order: 0 });

  const openCreate = () => {
    setEditingId(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (f: NonNullable<typeof filters>[number]) => {
    setEditingId(f._id);
    setForm({
      name: f.name, slug: f.slug,
      categoryId: f.categoryId, options: (f.options ?? []).join(', '),
      order: f.order,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug || !form.categoryId) { toast.error('Լրացրեք անուն, slug и категория'); return; }
    try {
      const options = form.options.split(',').map((s) => s.trim()).filter(Boolean);
      const data = {
        sessionToken: sessionToken ?? '',
        name: form.name, slug: form.slug, type: 'multiselect' as const,
        categoryId: form.categoryId as Id<'categories'>,
        options: options.length > 0 ? options : undefined,
        order: form.order,
      };
      if (editingId) {
        await updateFilter({ ...data, id: editingId });
        toast.success('Ֆիլտրը թարմացվել է');
      } else {
        await createFilter(data);
        toast.success('Ֆիլտրը ստեղծվել է');
      }
      setDialogOpen(false);
      resetForm();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Сшибка'); }
  };

  const handleDelete = async () => {
    if (!deleteId || !sessionToken) return;
    try { await removeFilter({ sessionToken, id: deleteId }); toast.success('Ֆիլտրը ջնջվել է'); setDeleteId(null); } catch (e) { toast.error('Сшибка'); }
  };

  const catMap: Record<string, string> = {};
  if (categories) for (const c of categories) catMap[c._id] = c.name;

  const grouped: Record<string, typeof filters> = {};
  if (filters) for (const f of filters) {
    const cat = catMap[f.categoryId] || 'Առանց կատեգորիայի';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(f);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ֆիլտրեր</h1>
          <p className="text-sm text-muted-foreground">{filters?.length ?? 0} ֆիլտր</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Ստեղծել ֆիլտր</Button>
      </div>

      {!filters || !categories ? <p className="text-muted-foreground">Բեռնվում...</p> : Object.entries(grouped).length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <SlidersHorizontal className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground">Ֆիլտրեր չեն գտնվել</p>
          <Button onClick={openCreate} variant="outline" className="gap-2"><Plus className="h-4 w-4" /> Ստեղծել առաջին ֆիլտրը</Button>
        </div>
      ) : Object.entries(grouped).map(([cat, items]) => items && (
        <div key={cat} className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">{cat}</h2>
          <div className="space-y-2">
            {items.map((f) => (
              <div key={f._id} className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/30">
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/30" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{f.name}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <code className="text-[10px] text-muted-foreground">{f.slug}</code>
                    <Badge variant="secondary" className="text-[10px]">բազմակի</Badge>
                    {f.options && f.options.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">{f.options.length} տարբերակ</span>
                    )}
                    <span className="text-[10px] text-muted-foreground">: {f.order}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon-sm" className="h-8 w-8" onClick={() => openEdit(f)}><Edit className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(f._id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) { setDialogOpen(false); resetForm(); } }}>
        <DialogContent className="sm:max-w-lg" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Խմբագրել ֆիլտրը' : 'Ստեղծել նոր ֆիլտր'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Անվանում *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: editingId ? form.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_') })} placeholder="Ор.՝ Ապրանքանիշ" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="brand" className="h-11 font-mono text-xs" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Կատեգորիա *</Label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                <option value="">Ընրել...</option>
                {categories?.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Տեսակներ (առանց տեսակ)</Label>
              <Input value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} placeholder="Bosch, Mobil, Castrol, Shell" className="h-11" />
              <p className="text-[10px] text-muted-foreground">Առանց տեսակ, օրինակ. Bosch, Mobil, Castrol, Shell</p>
            </div>
            <div className="space-y-2">
              <Label>Կարգ</Label>
              <Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} className="h-11" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { setDialogOpen(false); resetForm(); }}>Չեղարկել</Button>
            <Button className="flex-1" onClick={handleSave}>{editingId ? 'Թարմացնել' : 'Ստեղծել'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <DialogTitle className="text-center">Ջնջե՞լ ֆիլտրը</DialogTitle>
            <p className="text-center text-sm text-muted-foreground">Այս գործողությունը հնարավոր է չի կարող վերականգնել:</p>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>Չեղարկել</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete}>Ջնջել</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
