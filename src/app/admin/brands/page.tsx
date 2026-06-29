'use client';

import { useRef, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, ImagePlus, ArrowUp, ArrowDown, ExternalLink, Tag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from '@/components/LocalizedLink';
import { useAuth } from '@/store/auth';
import { useUpload } from '@/hooks/useUpload';
import { useAdminT } from '@/lib/i18n/admin';

type BrandDoc = {
  _id: Id<'brands'>;
  name: string;
  slug: string;
  logoUrl?: string;
  order: number;
  isActive: boolean;
};

function BrandRow({
  brand,
  index,
  total,
  sessionToken,
  onMove,
}: {
  brand: BrandDoc;
  index: number;
  total: number;
  sessionToken: string;
  onMove: (index: number, dir: -1 | 1) => void;
}) {
  const { t } = useAdminT();
  const update = useMutation(api.brands.update);
  const remove = useMutation(api.brands.remove);
  const { upload, uploading } = useUpload();
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleActive = async () => {
    try {
      await update({ sessionToken, id: brand._id, isActive: !brand.isActive });
      toast.success(brand.isActive ? t('acat.brandDeactivated') : t('acat.brandActivated'));
    } catch {
      toast.error(t('acat.error'));
    }
  };

  const changeLogo = async (file: File) => {
    const url = await upload(file);
    if (!url) return;
    try {
      await update({ sessionToken, id: brand._id, logoUrl: url });
      toast.success(t('acat.brandUpdated'));
    } catch {
      toast.error(t('acat.error'));
    }
  };

  const handleDelete = async () => {
    if (!confirm(`${t('acat.delete')} "${brand.name}"?`)) return;
    try {
      await remove({ sessionToken, id: brand._id });
      toast.success(t('acat.brandDeleted'));
    } catch {
      toast.error(t('acat.error'));
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-card">
      {/* Logo */}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-white"
        title={t('acat.changeLogo')}
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : brand.logoUrl ? (
          <Image src={brand.logoUrl} alt={brand.name} width={64} height={64} className="h-full w-full object-contain p-1" />
        ) : (
          <ImagePlus className="h-6 w-6 text-muted-foreground/50" />
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          if (e.target.files?.[0]) await changeLogo(e.target.files[0]);
          e.target.value = '';
        }}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-semibold">{brand.name}</h3>
          <Switch checked={brand.isActive} onCheckedChange={toggleActive} size="sm" />
        </div>
        <div className="mt-1 flex items-center gap-2">
          <Badge variant={brand.isActive ? 'default' : 'secondary'} className="text-[10px]">
            {brand.isActive ? t('acat.active') : t('acat.inactive')}
          </Badge>
          <Link
            href={`/products?brand=${encodeURIComponent(brand.name)}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary"
          >
            <ExternalLink className="h-3 w-3" /> {t('acat.viewProducts')}
          </Link>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button size="icon-sm" variant="ghost" className="h-7 w-7" disabled={index === 0} onClick={() => onMove(index, -1)}>
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon-sm" variant="ghost" className="h-7 w-7" disabled={index === total - 1} onClick={() => onMove(index, 1)}>
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon-sm" variant="ghost" className="h-7 w-7" onClick={() => fileRef.current?.click()} title={t('acat.changeLogo')}>
          <ImagePlus className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon-sm" variant="destructive" className="h-7 w-7" onClick={handleDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function AdminBrandsPage() {
  const { sessionToken } = useAuth();
  const { t } = useAdminT();
  const brands = useQuery(api.brands.listAll, {}) as BrandDoc[] | undefined;
  const productBrands = useQuery(api.products.getBrands, {});
  const create = useMutation(api.brands.create);
  const reorder = useMutation(api.brands.reorder);
  const { upload, uploading } = useUpload();

  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);
  const addFileRef = useRef<HTMLInputElement>(null);

  // Brand names that don't yet have a logo card — handy suggestions.
  const existingNames = new Set((brands ?? []).map((b) => b.name.toLowerCase()));
  const suggestions = (productBrands ?? []).filter((b) => !existingNames.has(b.toLowerCase()));

  const handleAddLogo = async (file: File) => {
    const url = await upload(file);
    if (url) setLogoUrl(url);
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error(t('acat.nameRequired'));
      return;
    }
    setCreating(true);
    try {
      await create({ sessionToken: sessionToken ?? '', name: trimmed, logoUrl, isActive: true });
      toast.success(t('acat.brandAdded'));
      setName('');
      setLogoUrl(undefined);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('acat.error'));
    } finally {
      setCreating(false);
    }
  };

  const onMove = async (index: number, dir: -1 | 1) => {
    if (!brands) return;
    const target = index + dir;
    if (target < 0 || target >= brands.length) return;
    const arr = [...brands];
    [arr[index], arr[target]] = [arr[target], arr[index]];
    try {
      await reorder({ sessionToken: sessionToken ?? '', items: arr.map((b, i) => ({ id: b._id, order: i })) });
    } catch {
      toast.error(t('acat.error'));
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('acat.brands')}</h1>
        <p className="text-muted-foreground">{brands?.length ?? 0} {t('acat.brandsLower')}</p>
      </div>

      {/* Add form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Tag className="h-5 w-5 text-primary" /> {t('acat.addBrand')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <button
              type="button"
              onClick={() => addFileRef.current?.click()}
              className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-white hover:border-primary"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : logoUrl ? (
                <Image src={logoUrl} alt="" width={80} height={80} className="h-full w-full object-contain p-1.5" />
              ) : (
                <ImagePlus className="h-7 w-7 text-muted-foreground/50" />
              )}
            </button>
            <input
              ref={addFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                if (e.target.files?.[0]) await handleAddLogo(e.target.files[0]);
                e.target.value = '';
              }}
            />

            <div className="flex-1">
              <Label>{t('acat.brandName')}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                list="brand-suggestions"
                placeholder={t('acat.brandNamePlaceholder')}
                className="h-11"
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              />
              <datalist id="brand-suggestions">
                {suggestions.map((b) => <option key={b} value={b} />)}
              </datalist>
              <p className="mt-1 text-[11px] text-muted-foreground">{t('acat.brandNameHint')}</p>
            </div>

            <Button onClick={handleCreate} disabled={creating || uploading} className="gap-2">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {t('acat.add')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {brands?.map((b, i) => (
          <BrandRow key={b._id} brand={b} index={i} total={brands.length} sessionToken={sessionToken ?? ''} onMove={onMove} />
        ))}
      </div>

      {brands?.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Tag className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground">{t('acat.noBrands')}</p>
        </div>
      )}
    </div>
  );
}
