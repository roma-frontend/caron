'use client';

import { useState, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowLeft, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { Badge } from '@/components/ui/badge';

interface ParsedRow {
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  category: string;
  sku?: string;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  showInPromotions?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  attributes: Record<string, string>;
  vehicleCompat: Array<{ brand: string; model: string; yearFrom: number; yearTo: number }>;
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length < 2) throw new Error('CSV ֆայլը պետք է ունենա վերնագրի տող և առնվազն մեկ տվյալների տող։');
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1).map((l) => l.split(',').map((c) => c.trim()).map((c) => c.replace(/^"|"$/g, '')));
  return { headers, rows };
}

const BOOL_MAP: Record<string, boolean> = { yes: true, '1': true, да: true, '+': true, айо: true, no: false, '0': false, нет: false, '-': false, not: false, ոչ: false };

const COLUMN_MAP: Record<string, string> = {
  name: 'name', slug: 'slug', description: 'description', price: 'price',
  compareatprice: 'compareAtPrice', category: 'category', sku: 'sku', stock: 'stock',
  isactive: 'isActive', isfeatured: 'isFeatured', showinpromotions: 'showInPromotions',
  seotitle: 'seoTitle', seodescription: 'seoDescription',
};

function getColumnAliases(): string[] {
  return Object.keys(COLUMN_MAP);
}

function parseRow(headers: string[], values: string[], categoriesMap: Record<string, string>): ParsedRow {
  const get = (key: string) => {
    const h = headers.map((h) => h.toLowerCase().trim());
    const col = getColumnAliases().find((alias) => h.includes(alias));
    if (!col) return '';
    const idx = h.findIndex((h) => h.includes(col));
    return idx >= 0 ? values[idx] || '' : '';
  };

  const catName = get('category') || get('կատեգորիա') || values[headers.findIndex(h => h.includes('cat'))] || '';
  const categoryId = categoriesMap[catName.toLowerCase().trim()];
  if (!categoryId) throw new Error(`Կատեգորիա "${catName}" չի գտնվել. Հնարավոր կատեգորիաները՝ ${Object.keys(categoriesMap).join(', ')}`);

  const bool = (key: string): boolean => BOOL_MAP[get(key).toLowerCase().trim()] ?? true;
  const num = (key: string): number => Number(get(key)) || 0;

  const attrs: Record<string, string> = {};
  const vc: Array<{ brand: string; model: string; yearFrom: number; yearTo: number }> = [];
  const currentVc: Partial<{ brand: string; model: string; yearFrom: number; yearTo: number }> = {};

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().trim();
    const v = values[i] || '';
    if (!v) continue;

    if (h.startsWith('attr_') || h.startsWith('attribute_') || h.startsWith('filter_')) {
      const key = h.replace(/^(attr_|attribute_|filter_)/, '');
      if (key) attrs[key] = v;
      continue;
    }

    if (h === 'vehicle_brand' || h === 'vbrand' || h === 'car_brand') {
      currentVc.brand = v;
      continue;
    }
    if (h === 'vehicle_model' || h === 'vmodel' || h === 'car_model') {
      currentVc.model = v;
      continue;
    }
    if (h === 'vehicle_yearfrom' || h === 'vfrom' || h === 'yearfrom' || h === 'year_from') {
      currentVc.yearFrom = Number(v);
      continue;
    }
    if (h === 'vehicle_yearto' || h === 'vto' || h === 'yearto' || h === 'year_to') {
      currentVc.yearTo = Number(v);
      continue;
    }
  }

  if (currentVc.brand && currentVc.model && currentVc.yearFrom && currentVc.yearTo) {
    vc.push(currentVc as { brand: string; model: string; yearFrom: number; yearTo: number });
  }

  const slug = get('slug') || get('productslug') || values[0].toLowerCase().replace(/[^a-z0-9а-я]+/g, '-').replace(/-+$/, '');

  return {
    name: get('name') || values[0],
    slug,
    description: get('description') || '',
    price: num('price') || num('cost') || 0,
    compareAtPrice: num('compareAtPrice') || undefined,
    category: catName,
    sku: get('sku') || undefined,
    stock: num('stock') || num('quantity') || 1,
    isActive: bool('isActive'),
    isFeatured: bool('isFeatured'),
    showInPromotions: get('showInPromotions') ? bool('showInPromotions') : undefined,
    seoTitle: get('seoTitle') || undefined,
    seoDescription: get('seoDescription') || undefined,
    attributes: attrs,
    vehicleCompat: vc,
  };
}

export default function ImportProductsPage() {
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const categories = useQuery(api.categories.list, {});
  const bulkCreate = useMutation(api.products.bulkCreate);
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  const categoriesMap: Record<string, string> = {};
  if (categories) for (const c of categories) categoriesMap[c.name.toLowerCase()] = c._id;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrors([]);
    setParsed(null);
    setDone(false);
    try {
      const text = await file.text();
      const { headers, rows } = parseCsv(text);
      const mapped: ParsedRow[] = [];
      const errs: string[] = [];
      for (let i = 0; i < rows.length; i++) {
        try {
          mapped.push(parseRow(headers, rows[i], categoriesMap));
        } catch (e) {
          errs.push(`Տող ${i + 2}: ${e instanceof Error ? e.message : 'Սխալ'}`);
        }
      }
      if (mapped.length === 0) { toast.error('Չհաջողվեց գտնել որևէ տող'); return; }
      setParsed(mapped);
      if (errs.length > 0) setErrors(errs);
      toast.success(`Հայտնաբերվել ${mapped.length} ապրանք${errs.length > 0 ? `, ${errs.length} սխալ` : ''}`);
    } catch (e) {
      toast.error(`Սխալ: ${e instanceof Error ? e.message : 'Նախատեսված ձևաչափ'}`);
    }
  };

  const handleImport = async () => {
    if (!parsed || !sessionToken) return;
    setImporting(true);
    try {
      const products: Parameters<typeof bulkCreate>[0]['products'] = parsed.map((r) => ({
        name: r.name,
        slug: r.slug,
        description: r.description,
        price: r.price,
        compareAtPrice: r.compareAtPrice || undefined,
        categoryId: categoriesMap[r.category.toLowerCase().trim()] as Id<'categories'>,
        sku: r.sku || undefined,
        stock: r.stock,
        isActive: r.isActive,
        isFeatured: r.isFeatured || undefined,
      }));
      const result = await bulkCreate({ sessionToken, products });
      toast.success(`${result}. Ատրիբուտները և համատեղելիությունը պետք է ավելացվի խմբագրիչի միջոցով.`);
      setDone(true);
    } catch (e) {
      toast.error(`Սխալ ներմուծում: ${e instanceof Error ? e.message : 'Անհայտ սխալ'}`);
    } finally { setImporting(false); }
  };

  const catKeys = Object.keys(categoriesMap);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/products"><Button variant="ghost" size="icon-sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold">Ներմուծել CSV ֆայլից</h1>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Upload className="h-5 w-5 text-primary" /> Ներբեռնել ֆայլ</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-4 rounded-lg border-2 border-dashed border-muted-foreground/30 p-8 text-center hover:border-primary/50 transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
            <FileSpreadsheet className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium">Կտտացրու, որպեսզի ընտրես CSV-ֆայլ</p>
            <p className="mt-1 text-xs text-muted-foreground">Արտահանված Excel-ից: Ֆայլ → Պահպանել որպես → CSV UTF-8</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleFile} />

          {/* Column reference */}
          <details className="group">
            <summary className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
              <Info className="h-3.5 w-3.5" />
              Լրիվ ցուցակ սպասարկվող սյունակների
            </summary>
            <div className="mt-3 space-y-4 text-xs">
              <div>
                <p className="mb-1.5 font-semibold text-foreground">Հիմական սյունակներ</p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {[
                    ['name', 'Անվանում (պարտադիր)'],
                    ['slug', 'URL-ադրես (եթե դատարկ է — կգոյացնվի անվանումից)'],
                    ['description', 'Ապրանքի նկարագրություն'],
                    ['price', 'Գին դրամներով (պարտադիր)'],
                    ['compareAtPrice', 'Старая цена (для скидки)'],
                    ['stock', 'Քանակ պահեստում (լռելյային 1)'],
                    ['sku', 'Արտիկուլ ապրանքի'],
                    ['category', 'Կատեգորիա — պետք է համապատասխանի համակարգում գրված անվանմանը'],
                    ['isActive', 'Ակտիվ՝ yes/no/1/0 (լռելյային yes)'],
                    ['isFeatured', 'Առաջարկված՝ yes/no/1/0 (լռելյային no)'],
                    ['showInPromotions', 'Ցուցադրել ակցիաներում՝ yes/no/1/0 (լռելյային no)'],
                    ['seoTitle', 'SEO վերնագիր'],
                    ['seoDescription', 'SEO նկարագրություն'],
                  ].map(([col, hint]) => (
                    <div key={col} className="flex gap-2 rounded-lg border bg-muted/30 px-3 py-1.5">
                      <code className="shrink-0 font-bold text-primary">{col}</code>
                      <span className="text-muted-foreground">{hint}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 font-semibold text-foreground">Ատրիբուտներ / ֆիլտրեր</p>
                <p className="mb-2 text-muted-foreground">Յուրաքանչյուր ֆիլտրի համար ավելացրու սյունակ <code className="text-primary">attr_ՖիլտրիԱնվանում</code></p>
                <details>
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Կատեգորիաների օրինակներ</summary>
                  <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-muted p-3 leading-relaxed text-muted-foreground">
{`Анивнер: attr_brand, attr_season, attr_width, attr_profile, attr_diameter
Нютер:   attr_brand, attr_viscosity, attr_oilType, attr_volume, attr_apiClass
Кочлак:  attr_brand, attr_brakeType, attr_axle, attr_material`}
                  </pre>
                </details>
              </div>
              <div>
                <p className="mb-1.5 font-semibold text-foreground">Ավտոմեքենայի համատեղություն</p>
                <p className="text-muted-foreground">Ավելացրու սյունակներ: <code className="text-primary">vehicle_brand</code>, <code className="text-primary">vehicle_model</code>, <code className="text-primary">vehicle_yearFrom</code>, <code className="text-primary">vehicle_yearTo</code></p>
              </div>
            </div>
          </details>
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <Card className="mb-6 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">{errors.length} սխալ</span>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">{errors.map((e, i) => <p key={i} className="text-xs text-muted-foreground">{e}</p>)}</div>
          </CardContent>
        </Card>
      )}

      {parsed && parsed.length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Ապրանքի ({parsed.length} Նախադիտում)
          </CardTitle></CardHeader>
          <CardContent>
            <div className="max-h-80 overflow-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr className="border-b">
                    <th className="p-2 text-left font-medium">Անվանում</th>
                    <th className="p-2 text-left font-medium">Գին</th>
                    <th className="p-2 text-left font-medium">Կատեգորիա</th>
                    <th className="p-2 text-left font-medium">SKU</th>
                    <th className="p-2 text-left font-medium">Մնացորդ</th>
                    <th className="p-2 text-left font-medium">Ակտիվ</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((r, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="p-2 max-w-[200px] truncate" title={r.name}>{r.name}</td>
                      <td className="p-2 whitespace-nowrap">{r.price.toLocaleString()} ֏</td>
                      <td className="p-2">{r.category}</td>
                      <td className="p-2 font-mono">{r.sku || '—'}</td>
                      <td className="p-2">{r.stock}</td>
                      <td className="p-2">{r.isActive ? '✅' : '❌'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-amber-600">
              <Info className="h-3.5 w-3.5" />
              Ատրիբուտներ (ֆիլտրեր) և համատեղություն ավտոմեքենայի հետ պահպանվում են հետևյալ կերպ, ստուգելով ապրանքի խմբագրիչը կամայական կերպով:
            </div>

            <Button onClick={handleImport} disabled={importing || done} size="lg" className="mt-4 w-full gap-2">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? <CheckCircle2 className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
              {importing ? 'Ներմուծվում է...' : done ? 'Ներմուծվել է' : `Ներմուծել ${parsed.length} ապրանք`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Category reference */}
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer hover:text-foreground">Հայտնի կատեգորիաներ</summary>
        <div className="mt-2 flex flex-wrap gap-1.5">{catKeys.map((k) => <Badge key={k} variant="outline" className="text-[10px]">{k}</Badge>)}</div>
      </details>
    </div>
  );
}
