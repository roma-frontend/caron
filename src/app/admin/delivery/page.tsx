'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Truck, Trash2, Plus, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';

const L = {
  "title": "Առաքման ժամանակացույց",
  "subtitle": "խմբագրեք առաքման ժամկետները՝ ըստ վայրի",
  "yerevan": "Երևանի համայնքներ",
  "regions": "Մարզեր",
  "schedule": "Ժամանակացույց",
  "save": "Պահպանել",
  "saved": "Պահպանվեց",
  "del": "Ջնջել",
  "deleted": "Ջնջվեց",
  "add": "Ավելացնել վայր",
  "seed": "Ստեղծել սկզբնական ցանկը",
  "name": "Անուն",
  "active": "Ակտիվ",
  "empty": "Դեռ վայրեր չկան",
  "schedulePh": "Օրինակ՝ Ամեն օր, երկուշաբթի և հինգշաբթի",
  "confirmDel": "Ջնջե՞լ"
};

type Zone = {
  _id: Id<'deliveryZones'>;
  group: 'yerevan' | 'region';
  name: string;
  schedule: string;
  order: number;
  isActive: boolean;
};

function ZoneRow({ zone, sessionToken }: { zone: Zone; sessionToken: string }) {
  const upsert = useMutation(api.delivery.upsert);
  const remove = useMutation(api.delivery.remove);
  const [name, setName] = useState(zone.name);
  const [schedule, setSchedule] = useState(zone.schedule);
  const [isActive, setIsActive] = useState(zone.isActive);
  const [saving, setSaving] = useState(false);

  // Keep local state in sync if the server value changes elsewhere.
  useEffect(() => { setName(zone.name); setSchedule(zone.schedule); setIsActive(zone.isActive); }, [zone._id]);

  const dirty = name !== zone.name || schedule !== zone.schedule || isActive !== zone.isActive;

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsert({ sessionToken, id: zone._id, group: zone.group, name: name.trim(), schedule, isActive });
      toast.success(L.saved);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`${L.confirmDel} "${zone.name}"?`)) return;
    await remove({ sessionToken, id: zone._id });
    toast.success(L.deleted);
  };

  return (
    <div className="rounded-xl border bg-background p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} className="font-medium" />
        <label className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          <Switch checked={isActive} onCheckedChange={setIsActive} />
          {L.active}
        </label>
        <Button size="icon" variant="ghost" onClick={handleDelete} aria-label={L.del}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      <Textarea
        value={schedule}
        onChange={(e) => setSchedule(e.target.value)}
        placeholder={L.schedulePh}
        rows={3}
        className="resize-y"
      />
      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={!dirty || saving}>
          <Save className="mr-2 h-4 w-4" /> {L.save}
        </Button>
      </div>
    </div>
  );
}

function GroupSection({ title, group, zones, sessionToken }: { title: string; group: 'yerevan' | 'region'; zones: Zone[]; sessionToken: string }) {
  const upsert = useMutation(api.delivery.upsert);
  const [newName, setNewName] = useState('');

  const handleAdd = async () => {
    const n = newName.trim();
    if (!n) return;
    await upsert({ sessionToken, group, name: n, schedule: '' });
    setNewName('');
    toast.success(L.saved);
  };

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-xl font-bold text-primary">
        <Truck className="h-5 w-5" /> {title}
      </h2>
      <div className="space-y-3">
        {zones.map((z) => <ZoneRow key={z._id} zone={z} sessionToken={sessionToken} />)}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          placeholder={L.name}
          className="max-w-xs"
        />
        <Button variant="outline" size="sm" onClick={handleAdd} disabled={!newName.trim()}>
          <Plus className="mr-2 h-4 w-4" /> {L.add}
        </Button>
      </div>
    </section>
  );
}

export default function AdminDeliveryPage() {
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const zones = useQuery(api.delivery.listAdmin, sessionToken ? { sessionToken } : 'skip') as Zone[] | undefined;
  const seed = useMutation(api.delivery.seed);

  const handleSeed = async () => {
    if (!sessionToken) return;
    const res = await seed({ sessionToken });
    toast.success(res === 'already-seeded' ? L.saved : L.saved);
  };

  const yerevan = (zones ?? []).filter((z) => z.group === 'yerevan');
  const regions = (zones ?? []).filter((z) => z.group === 'region');
  const isEmpty = zones !== undefined && zones.length === 0;

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold">{L.title}</h1>
          <p className="text-sm text-muted-foreground">{L.subtitle}</p>
        </div>
        {isEmpty && (
          <Button onClick={handleSeed}>
            <Sparkles className="mr-2 h-4 w-4" /> {L.seed}
          </Button>
        )}
      </div>

      {isEmpty ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <Truck className="mx-auto mb-3 h-10 w-10 opacity-50" />
          <p>{L.empty}</p>
        </div>
      ) : (
        <div className="space-y-10">
          {sessionToken && <GroupSection title={L.yerevan} group="yerevan" zones={yerevan} sessionToken={sessionToken} />}
          {sessionToken && <GroupSection title={L.regions} group="region" zones={regions} sessionToken={sessionToken} />}
        </div>
      )}
    </div>
  );
}
