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

const CAR_DATA: Record<string, Record<string, string[]>> = {
  Toyota: { Camry: ['2018', '2019', '2020', '2021', '2022', '2023', '2024'], Corolla: ['2018', '2019', '2020', '2021', '2022', '2023', '2024'], RAV4: ['2018', '2019', '2020', '2021', '2022', '2023', '2024'], 'Land Cruiser': ['2018', '2019', '2020', '2021', '2022', '2023'], Prius: ['2018', '2019', '2020', '2021', '2022', '2023'] },
  BMW: { '3 Series': ['2018', '2019', '2020', '2021', '2022', '2023', '2024'], '5 Series': ['2018', '2019', '2020', '2021', '2022', '2023', '2024'], X3: ['2018', '2019', '2020', '2021', '2022', '2023'], X5: ['2018', '2019', '2020', '2021', '2022', '2023'], X7: ['2020', '2021', '2022', '2023'] },
  Mercedes: { 'C-Class': ['2018', '2019', '2020', '2021', '2022', '2023'], 'E-Class': ['2018', '2019', '2020', '2021', '2022', '2023'], GLC: ['2019', '2020', '2021', '2022', '2023'], GLE: ['2019', '2020', '2021', '2022', '2023'], 'S-Class': ['2020', '2021', '2022', '2023'] },
  Hyundai: { Tucson: ['2018', '2019', '2020', '2021', '2022', '2023', '2024'], 'Santa Fe': ['2018', '2019', '2020', '2021', '2022', '2023'], Elantra: ['2018', '2019', '2020', '2021', '2022', '2023', '2024'], Sonata: ['2018', '2019', '2020', '2021', '2022', '2023'], Creta: ['2020', '2021', '2022', '2023', '2024'] },
  Kia: { Sportage: ['2018', '2019', '2020', '2021', '2022', '2023', '2024'], Sorento: ['2018', '2019', '2020', '2021', '2022', '2023'], Cerato: ['2018', '2019', '2020', '2021', '2022', '2023', '2024'], Seltos: ['2020', '2021', '2022', '2023', '2024'], Rio: ['2018', '2019', '2020', '2021', '2022', '2023'] },
  Nissan: { Qashqai: ['2018', '2019', '2020', '2021', '2022', '2023'], 'X-Trail': ['2018', '2019', '2020', '2021', '2022', '2023'], Juke: ['2019', '2020', '2021', '2022', '2023'], Patrol: ['2018', '2019', '2020', '2021', '2022', '2023'] },
  Honda: { Civic: ['2018', '2019', '2020', '2021', '2022', '2023', '2024'], 'CR-V': ['2018', '2019', '2020', '2021', '2022', '2023'], Accord: ['2018', '2019', '2020', '2021', '2022', '2023'], 'HR-V': ['2019', '2020', '2021', '2022', '2023'] },
  VW: { Golf: ['2018', '2019', '2020', '2021', '2022', '2023'], Tiguan: ['2018', '2019', '2020', '2021', '2022', '2023'], Passat: ['2018', '2019', '2020', '2021', '2022', '2023'], Polo: ['2018', '2019', '2020', '2021', '2022', '2023'] },
  Audi: { A4: ['2018', '2019', '2020', '2021', '2022', '2023'], A6: ['2018', '2019', '2020', '2021', '2022', '2023'], Q5: ['2018', '2019', '2020', '2021', '2022', '2023'], Q7: ['2018', '2019', '2020', '2021', '2022', '2023'] },
  Ford: { Focus: ['2018', '2019', '2020', '2021', '2022'], Kuga: ['2018', '2019', '2020', '2021', '2022', '2023'], Mondeo: ['2018', '2019', '2020', '2021', '2022'], Explorer: ['2019', '2020', '2021', '2022', '2023'] },
  Opel: { Astra: ['2018', '2019', '2020', '2021', '2022'], Corsa: ['2019', '2020', '2021', '2022', '2023'], Grandland: ['2019', '2020', '2021', '2022', '2023'] },
  Mazda: { CX5: ['2018', '2019', '2020', '2021', '2022', '2023'], '3': ['2018', '2019', '2020', '2021', '2022', '2023'], '6': ['2018', '2019', '2020', '2021', '2022'] },
};

const BRANDS = Object.keys(CAR_DATA);

export default function CarSelectorPage() {
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
    <div className="mx-auto" style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--space-container)', paddingBlock: 'var(--space-8)' }}>
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Car className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">{'Ավտոմեքենայի ընտրություն'}</h1>
        <p className="mt-2 text-muted-foreground">{'Ընտրեք ձեր ավտոմեքենայի պարամետրերը, և կգտնեք համապատասխան ապրանքները'}</p>
      </div>

      {/* Selector */}
      <Card className="mx-auto max-w-2xl mb-10">
        <CardContent className="p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">{'Արտադրող'}</label>
              <Select value={brand} onValueChange={(v) => { setBrand(v ?? ''); setModel(''); setYear(''); setSearching(false); }}>
                <SelectTrigger className="h-11"><SelectValue placeholder={'Արտադրող'} /></SelectTrigger>
                <SelectContent>{BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{'Մոդել'}</label>
              <Select value={model} onValueChange={(v) => { setModel(v ?? ''); setYear(''); setSearching(false); }} disabled={!brand}>
                <SelectTrigger className="h-11"><SelectValue placeholder={'Մոդել'} /></SelectTrigger>
                <SelectContent>{models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{'Տարի'}</label>
              <Select value={year} onValueChange={(v) => { setYear(v ?? ''); setSearching(false); }} disabled={!model}>
                <SelectTrigger className="h-11"><SelectValue placeholder={'Տարի'} /></SelectTrigger>
                <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSearch} disabled={!brand} size="lg" className="w-full mt-4 gap-2">
            <Search className="h-5 w-5" /> {'Որոնել'}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {searching && status === 'LoadingFirstPage' && <Loader />}
      {searching && results && results.length > 0 && (
        <div>
          <h2 className="mb-4 font-bold">{'Արդյունքներ {results.length}'}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {results.map((p, i) => (
              <ProductCard key={p._id} id={p._id} slug={p.slug} name={p.name} price={p.price} compareAtPrice={p.compareAtPrice} image={p.images?.[0]} inStock={p.stock > 0} stock={p.stock} index={i} />
            ))}
          </div>
        </div>
      )}
      {searching && results && results.length === 0 && status !== 'LoadingFirstPage' && (
        <p className="text-center text-muted-foreground py-10">{'Ոչ մի արդյունք չի գտնվել'}</p>
      )}
    </div>
  );
}
