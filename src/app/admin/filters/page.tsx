'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Edit, SlidersHorizontal, AlertTriangle, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/store/auth';
import type { Id } from '../../../../convex/_generated/dataModel';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { flushSync } from 'react-dom';

function SortableFilterCard({ f, catName, onEdit, onDelete }: {
  f: { _id: Id<'filterDefinitions'>; name: string; slug: string; type: string; order: number; options?: string[] };
  catName: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: f._id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : undefined };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/30">
      <button {...attributes} {...listeners} className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{f.name}</p>
        <div className="flex flex-wrap items-center gap-2 mt-0.5">
          <code className="text-[10px] text-muted-foreground">{f.slug}</code>
          <Badge variant="secondary" className="text-[10px]">{f.type}</Badge>
          {f.options && f.options.length > 0 && <span className="text-[10px] text-muted-foreground">{f.options.length} {'Ցանկ'}</span>}
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="icon-sm" className="h-8 w-8" onClick={onEdit}><Edit className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}

export default function AdminFiltersPage() {
  const { sessionToken } = useAuth();
  const filters = useQuery(api.filters.listAll, {});
  const categories = useQuery(api.categories.list, {});
  const createFilter = useMutation(api.filters.create);
  const updateFilter = useMutation(api.filters.update);
  const removeFilter = useMutation(api.filters.remove);
  const reorderFilters = useMutation(api.filters.reorder);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<'filterDefinitions'> | null>(null);
  const [deleteId, setDeleteId] = useState<Id<'filterDefinitions'> | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', categoryId: '' as string, options: '', order: 0 });
  const [optimisticOrder, setOptimisticOrder] = useState<Map<string, number>>(new Map());

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const resetForm = () => setForm({ name: '', slug: '', categoryId: '', options: '', order: 0 });

  const openCreate = () => { setEditingId(null); resetForm(); setDialogOpen(true); };

  const openEdit = (f: NonNullable<typeof filters>[number]) => {
    setEditingId(f._id);
    setForm({ name: f.name, slug: f.slug, categoryId: f.categoryId, options: (f.options ?? []).join(', '), order: f.order });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug || !form.categoryId) { toast.error('Անվանում, slug և կատեգորիա պետք է լրացվեն'); return; }
    try {
      const options = form.options.split(',').map((s) => s.trim()).filter(Boolean);
      const base = { name: form.name, slug: form.slug, type: 'multiselect' as const, categoryId: form.categoryId as Id<'categories'>, options: options.length > 0 ? options : undefined, order: form.order };
      if (editingId) {
        await updateFilter({ sessionToken: sessionToken ?? '', ...base, id: editingId });
        toast.success('Ֆիլտրը թարմացվեց');
      } else {
        await createFilter({ sessionToken: sessionToken ?? '', ...base });
        toast.success('Ֆիլտրը ստեղծվեց');
      }
      setDialogOpen(false); resetForm();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Ֆիլտրը չի ստեղծվել'); }
  };

  const handleDelete = async () => {
    if (!deleteId || !sessionToken) return;
    try { await removeFilter({ sessionToken, id: deleteId }); toast.success('Ֆիլտրը ջնջվեց'); setDeleteId(null); } catch { toast.error('Ֆիլտրը չի ջնջվել'); }
  };

  const catMap: Record<string, string> = {};
  if (categories) for (const c of categories) catMap[c._id] = c.name;

  const grouped: Record<string, NonNullable<typeof filters>> = {};
  if (filters) for (const f of [...filters].sort((a, b) => (optimisticOrder.get(a._id) ?? a.order) - (optimisticOrder.get(b._id) ?? b.order))) {
    const cat = catMap[f.categoryId] || 'Կատեգորիան չհայտնաբերվեց';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat]!.push(f);
  }

  const handleDragEnd = async (catItems: NonNullable<typeof filters>, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !sessionToken) return;
    const oldIndex = catItems.findIndex((f) => f._id === active.id);
    const newIndex = catItems.findIndex((f) => f._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(catItems, oldIndex, newIndex);
    const items = reordered.map((f, i) => ({ id: f._id, order: i }));

    // Instant optimistic update before server call
    flushSync(() => {
      setOptimisticOrder((prev) => {
        const next = new Map(prev);
        for (const item of items) next.set(item.id, item.order);
        return next;
      });
    });

    try {
      await reorderFilters({ sessionToken, items });
    } catch { toast.error('Ֆիլտրերը չի ստեղծվել'); }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{'Ֆիլտրեր'}</h1>
          <p className="text-sm text-muted-foreground">{filters?.length ?? 0} {'Ֆիլտրեր'}</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> {'Ավելացնել ֆիլտր'}</Button>
      </div>

      {!filters || !categories ? <p className="text-muted-foreground">{'Ֆիլտրեր չեն ստեղծվել...'}</p> : Object.entries(grouped).length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <SlidersHorizontal className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground">{'Ֆիլտրեր չեն ստեղծվել'}</p>
          <Button onClick={openCreate} variant="outline" className="gap-2"><Plus className="h-4 w-4" /> {'Ավելացնել ֆիլտր'}</Button>
        </div>
      ) : Object.entries(grouped).map(([cat, items]) => items && (
        <div key={cat} className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">{cat}</h2>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(items, e)}>
            <SortableContext items={items.map((f) => f._id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {items.map((f) => (
                  <SortableFilterCard key={f._id} f={f} catName={cat} onEdit={() => openEdit(f)} onDelete={() => setDeleteId(f._id)} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      ))}

      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) { setDialogOpen(false); resetForm(); } }}>
        <DialogContent className="sm:max-w-lg overflow-visible" showCloseButton={false}>
          <DialogHeader><DialogTitle>{editingId ? 'Խմբագրել ֆիլտրը' : 'Ավելացնել ֆիլտր'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{'Անվանում'} *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: editingId ? form.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_') })} placeholder="Անվանում" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="brand" className="h-11 font-mono text-xs" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{'Կատեգորիա'} *</Label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                <option value="">{'Ընտրել կատեգորիա'}</option>
                {categories?.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{'Տարրեր'}</Label>
              <Textarea value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} placeholder="Bosch, Mobil, Castrol, Shell" className="min-h-24 resize-y break-words [overflow-wrap:anywhere]" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { setDialogOpen(false); resetForm(); }}>{'Չեղարկել'}</Button>
            <Button className="flex-1" onClick={handleSave}>{editingId ? 'Խմբագրել' : 'Ավելացնել'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10"><AlertTriangle className="h-6 w-6 text-destructive" /></div>
            <DialogTitle className="text-center">{'Ջնջել ֆիլտրը'}</DialogTitle>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>{'Չեղարկել'}</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete}>{'Ջնջել'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
