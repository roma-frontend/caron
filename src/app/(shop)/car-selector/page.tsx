'use client';

import { useState } from 'react';
import { usePaginatedQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Car, Search } from 'lucide-react';
import { ProductCard } from '@/components/cards/ProductCard';
import { Loader } from '@/components/ui/loader';
import { CAR_DATA, CAR_BRANDS as BRANDS } from '@/lib/cars';
import { useSettings } from '@/hooks/useSettings';
import Link from 'next/link';
import { useT } from '@/lib/i18n/admin';

function Guard({ children }: { children: React.ReactNode }) {
  const { t } = useT();
  const settings = useSettings();
  if (settings && settings.enableCarSelector === false) {
    return (
      <div className="mx-auto py-16 text-center max-w-[var(--container-max)] px-[var(--space-container)]">
        <h1 className="text-2xl font-bold">{t('pg.carsel.title')}</h1>
        <p className="mt-3 text-muted-foreground">{t('pg.common.featureUnavailable')}</p>
        <Link href="/products" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
          {t('pg.common.allProducts')}
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}

export default function CarSelectorPage() {
  const { t } = useT();
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [searching, setSearching] = useState(false);

  const models = brand ? Object.keys(CAR_DATA[brand] ?? {}) : [];
  const years = brand && model ? (CAR_DATA[brand]?.[model] ?? []) : [];

  const searchQuery = searching && brand ? `${brand} ${model} ${year}`.trim() : undefined;

  const { results, status } = usePaginatedQuery(
    api.products.listPaginated,
    searchQuery ? { search: searchQuery, attributes: { carBrand: brand } } : 'skip',
    { initialNumItems: 20 },
  );

  const handleSearch = () => { if (brand) setSearching(true); };

  return (
    <Guard>
      <div className="mx-auto max-w-[var(--container-max)] sm:px-[var(--space-container)] py-[var(--space-8)]">
        <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Car className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">{t('pg.carsel.title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('pg.carsel.subtitle')}</p>
      </div>

      {/* Selector */}
      <Card className="mx-auto max-w-2xl mb-10">
        <CardContent className="p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t('pg.carsel.maker')}</label>
              <Select value={brand} onValueChange={(v) => { setBrand(v ?? ''); setModel(''); setYear(''); setSearching(false); }}>
                <SelectTrigger className="h-11" aria-label={t('pg.carsel.maker')}><SelectValue placeholder={t('pg.carsel.maker')} /></SelectTrigger>
                <SelectContent>{BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t('pg.common.model')}</label>
              <Select value={model} onValueChange={(v) => { setModel(v ?? ''); setYear(''); setSearching(false); }} disabled={!brand}>
                <SelectTrigger className="h-11" aria-label={t('pg.common.model')}><SelectValue placeholder={t('pg.common.model')} /></SelectTrigger>
                <SelectContent>{models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t('pg.common.year')}</label>
              <Select value={year} onValueChange={(v) => { setYear(v ?? ''); setSearching(false); }} disabled={!model}>
                <SelectTrigger className="h-11" aria-label={t('pg.common.year')}><SelectValue placeholder={t('pg.common.year')} /></SelectTrigger>
                <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSearch} disabled={!brand} size="lg" className="w-full mt-4 gap-2">
            <Search className="h-5 w-5" /> {t('pg.carsel.search')}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {searching && status === 'LoadingFirstPage' && <Loader />}
      {searching && results && results.length > 0 && (
        <div>
          <h2 className="mb-4 font-bold">{t('pg.carsel.results')}{' {results.length}'}</h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {results.map((p, i) => (
              <ProductCard key={p._id} id={p._id} slug={p.slug} atgCode={p.atgCode} sku={p.sku} name={p.name} nameRu={p.nameRu} nameEn={p.nameEn} price={p.price} wholesalePrice={p.wholesalePrice} compareAtPrice={p.compareAtPrice} retailDiscount={p.retailDiscount} wholesaleDiscount={p.wholesaleDiscount} image={p.images?.[0]} inStock={p.stock > 0} stock={p.stock} rating={p.rating} reviewCount={p.reviewCount} carBrand={p.attributes?.carBrand} attributes={p.attributes} index={i} />
            ))}
          </div>
        </div>
      )}
      {searching && results && results.length === 0 && status !== 'LoadingFirstPage' && (
        <p className="text-center text-muted-foreground py-10">{t('pg.carsel.noResults')}</p>
      )}
      </div>
    </Guard>
  );
}
