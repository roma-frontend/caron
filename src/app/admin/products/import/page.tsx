'use client';

import { useState, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowLeft, Loader2, Info, File as FileIcon } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';

interface ParsedRow {
  name?: string;
  slug?: string;
  description?: string;
  price?: number;
  wholesalePrice?: number;
  compareAtPrice?: number;
  images?: string[];
  category: string;
  sku?: string;
  oemNumbers?: Array<{ manufacturer: string; code: string }>;
  stock?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  showInPromotions?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  attributes?: Record<string, string>;
  vehicleCompat?: Array<{ brand: string; model: string; yearFrom: number; yearTo: number }>;
}

function splitLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === sep && !inQuotes) { result.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const clean = text.replace(/^\uFEFF/, '');
  const lines = clean.split('\n').filter((l) => l.trim());
  if (lines.length < 2) throw new Error('CSV ֆայլը պետք է ունենա վերնագրի տող և առնվազն մեկ տվյալների տող։');
  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = splitLine(lines[0], sep).map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1).map((l) => splitLine(l, sep));
  return { headers, rows };
}

const BOOL_MAP: Record<string, boolean> = { yes: true, '1': true, да: true, '+': true, այո: true, no: false, '0': false, нет: false, '-': false, not: false, ոչ: false };

const COLUMN_MAP: Record<string, string> = {
  name: 'name', slug: 'slug', description: 'description', price: 'price',
  compareatprice: 'compareAtPrice', wholesaleprice: 'wholesalePrice', wholesale: 'wholesalePrice', category: 'category', sku: 'sku', stock: 'stock',
  isactive: 'isActive', isfeatured: 'isFeatured', showinpromotions: 'showInPromotions',
  oemnumbers: 'oemNumbers', oem: 'oemNumbers',
  seotitle: 'seoTitle', seodescription: 'seoDescription',
  images: 'images', image: 'images',
};

function getColumnAliases(): string[] {
  return Object.keys(COLUMN_MAP);
}

function normalizeAttributeKey(rawKey: string): string {
  const key = rawKey.trim().toLowerCase();
  if (key === 'չափս' || key === 'size') return 'չափ';
  return key;
}

function parseRow(headers: string[], values: string[], categoriesMap: Record<string, string>): ParsedRow {
  const get = (key: string) => {
    const h = headers.map((h) => h.toLowerCase().trim());
    const idx = h.indexOf(key.toLowerCase());
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
      const key = normalizeAttributeKey(h.replace(/^(attr_|attribute_|filter_)/, ''));
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

  // Только заполненные поля будут включены в результат
  const result: ParsedRow = {
    category: catName,
  };

  const nameVal = get('name') || values[0];
  if (nameVal) result.name = nameVal;

  const slugVal = get('slug') || get('productslug') || (nameVal && nameVal.toLowerCase().replace(/[^a-z0-9\u0561-\u0587]+/g, '-').replace(/-+$/, ''));
  if (slugVal) result.slug = slugVal;

  const descVal = get('description');
  if (descVal) result.description = descVal;

  const priceVal = num('price') || num('cost');
  if (priceVal) result.price = priceVal;

  const wpVal = num('wholesalePrice') || num('wholesale');
  if (wpVal) result.wholesalePrice = wpVal;

  const cpVal = num('compareAtPrice');
  if (cpVal) result.compareAtPrice = cpVal;

  const skuVal = get('sku');
  if (skuVal) result.sku = skuVal;

  const oemStr = get('oemNumbers') || get('oem');
  if (oemStr) {
    const codes = oemStr.split(/[,;\s]+/).filter(Boolean);
    if (codes.length > 0) {
      const manufacturer = get('oemManufacturer') || get('oem_manufacturer') || get('mfg') || 'Unknown';
      result.oemNumbers = codes.map(code => ({
        manufacturer,
        code: code.trim().toUpperCase(),
      }));
    }
  }

  const stockVal = num('stock') || num('quantity');
  if (stockVal) result.stock = stockVal;

  const isActiveVal = get('isActive');
  if (isActiveVal) result.isActive = bool('isActive');

  const isFeaturedVal = get('isFeatured');
  if (isFeaturedVal) result.isFeatured = bool('isFeatured');

  const showPromoVal = get('showInPromotions');
  if (showPromoVal) result.showInPromotions = bool('showInPromotions');

  const seoTitleVal = get('seoTitle');
  if (seoTitleVal) result.seoTitle = seoTitleVal;

  const seoDescVal = get('seoDescription');
  if (seoDescVal) result.seoDescription = seoDescVal;

  const imagesVal = (get('images') || '').split(';').map((u) => u.trim()).filter(Boolean);
  if (imagesVal.length > 0) result.images = imagesVal;

  if (Object.keys(attrs).length > 0) result.attributes = attrs;

  if (vc.length > 0) result.vehicleCompat = vc;

  return result;
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
  const [debugInfo, setDebugInfo] = useState<string[] | null>(null);
  const [pasteText, setPasteText] = useState('');

  const categoriesMap: Record<string, string> = {};
  if (categories) for (const c of categories) categoriesMap[c.name.toLowerCase()] = c._id;

  const decodeFile = async (file: File): Promise<string> => {
    const buf = await file.arrayBuffer();
    const tries = ['utf-8', 'windows-1251'];
    for (const enc of tries) {
      try {
        return new TextDecoder(enc, { fatal: true }).decode(buf);
      } catch {}
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(buf);
  };

  const parseText = (text: string) => {
    if (Object.keys(categoriesMap).length === 0) {
      toast.error('Կատեգորիաները դեռ բեռնված չեն, սպասեք...');
      return;
    }
    const { headers, rows } = parseCsv(text);
    const info: string[] = [
      `Բաժանարար: "${text.includes(';') ? ';' : ','}"`,
      `Վերնագրեր: ${headers.join(', ')}`,
      `Առաջին տող: ${rows[0]?.join(' | ') || '(դատարկ)'}`,
      `Կատեգորիաներ DB: ${Object.keys(categoriesMap).join(', ')}`,
    ];
    setDebugInfo(info);
    const mapped: ParsedRow[] = [];
    const errs: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      try {
        mapped.push(parseRow(headers, rows[i], categoriesMap));
      } catch (e) {
        errs.push(`Տող ${i + 2}: ${e instanceof Error ? e.message : 'Սխալ'}`);
      }
    }
    setParsed(mapped);
    setErrors(errs);
    if (mapped.length === 0) { toast.error('Չհաջողվեց գտնել որևէ տող'); return; }
    toast.success(`Հայտնաբերվել է ${mapped.length} ապրանք${errs.length > 0 ? `, ${errs.length} սխալ` : ''}`);
  };

  const readXlsx = async (file: File): Promise<string> => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(ws, { header: 1, defval: '' });
    return rows.map((r) => r.map((c) => {
      if (c == null) return '';
      const v = String(c);
      return v.includes(';') || v.includes(',') ? `"${v}"` : v;
    }).join(';')).join('\n');
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrors([]);
    setParsed(null);
    setDone(false);
    setDebugInfo(null);
    setPasteText('');
    try {
      const text = file.name.endsWith('.xlsx') ? await readXlsx(file) : await decodeFile(file);
      parseText(text);
    } catch (e) {
      toast.error(`Սխալ: ${e instanceof Error ? e.message : 'Նախատեսված ձևաչափ'}`);
    }
  };

  const handlePaste = () => {
    if (!pasteText.trim()) { toast.error('Տեղադրեք տվյալները'); return; }
    setErrors([]);
    setParsed(null);
    setDone(false);
    setDebugInfo(null);
    parseText(pasteText);
  };

  const handleImport = async () => {
    if (!parsed || !sessionToken) return;
    setImporting(true);
    try {
      type BulkProduct = Parameters<typeof bulkCreate>[0]['products'][number];
      const products: BulkProduct[] = parsed.map((r) => {
        const p: BulkProduct = {
          category: r.category,
          categoryId: categoriesMap[r.category.toLowerCase().trim()] as Id<'categories'>,
        };
        // Передаем только заполненные поля
        if (r.name !== undefined) p.name = r.name;
        if (r.slug !== undefined) p.slug = r.slug;
        if (r.description !== undefined) p.description = r.description;
        if (r.price !== undefined) p.price = r.price;
        if (r.wholesalePrice !== undefined) p.wholesalePrice = r.wholesalePrice;
        if (r.compareAtPrice !== undefined) p.compareAtPrice = r.compareAtPrice;
        if (r.sku !== undefined) p.sku = r.sku;
        if (r.oemNumbers !== undefined && r.oemNumbers.length > 0) p.oemNumbers = r.oemNumbers;
        if (r.stock !== undefined) p.stock = r.stock;
        if (r.isActive !== undefined) p.isActive = r.isActive;
        if (r.isFeatured !== undefined) p.isFeatured = r.isFeatured;
        if (r.showInPromotions !== undefined) p.showInPromotions = r.showInPromotions;
        if (r.seoTitle !== undefined) p.seoTitle = r.seoTitle;
        if (r.seoDescription !== undefined) p.seoDescription = r.seoDescription;
        if (r.images !== undefined && r.images.length > 0) p.images = r.images;
        if (r.attributes !== undefined && Object.keys(r.attributes).length > 0) p.attributes = r.attributes;
        if (r.vehicleCompat !== undefined && r.vehicleCompat.length > 0) p.vehicleCompat = r.vehicleCompat;
        return p;
      });
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
          <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,.xlsx" className="hidden" onChange={handleFile} />

          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">կամ տեղադրեք տեքստը</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Պարզապես պատճենեք և տեղադրեք տեքստը այստեղ։"
              className="w-full h-28 rounded-lg border border-input bg-background p-3 text-xs font-mono resize-y"
            />
            <Button size="sm" variant="outline" className="mt-2 gap-1 text-xs" onClick={handlePaste} disabled={!pasteText.trim()}>
              <Upload className="h-3 w-3" /> Պարսել
            </Button>
          </div>

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
                    ['slug', 'URL-հասցե (եթե դատարկ է — կգոյացվի անվանումից)'],
                    ['description', 'Ապրանքի նկարագրություն'],
                    ['price', 'Մանրածախ գին դրամներով (պարտադիր)'],
                    ['wholesalePrice', 'Մեծածախ գին (եթե դատարկ է — կօգտագործվի մանրածախ գինը)'],
                    ['compareAtPrice', 'Հին գին (ցուցադրվում է որպես կտրատված)'],
                    ['stock', 'Քանակ պահեստում (քանակ 1)'],
                    ['sku', 'Արտիկուլ ապրանքի'],
                    ['oemNumbers / oem', 'OEM համարներ (բաժանել , ; կամ բացատ)'],
                    ['category', 'Կատեգորիա — պետք է համապատասխանի համակարգում գրված անվանմանը'],
                    ['isActive', 'Ակտիվ՝ yes/no/1/0 (լռելյային yes)'],
                    ['isFeatured', 'Առաջարկված՝ yes/no/1/0 (լռելյային no)'],
                    ['showInPromotions', 'Ցուցադրել ակցիաներում՝ yes/no/1/0 (լռելյային no)'],
                    ['images', 'Պատկերի URL-ը ; (արդեն նեմուծվել է (cloud)'],
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
                <p className="mb-2 text-muted-foreground">Չափի համար օգտագործեք <code className="text-primary">attr_չափ</code> (նաև <code className="text-primary">attr_չափս</code> և <code className="text-primary">attr_size</code> կպահվեն որպես <code className="text-primary">չափ</code>)</p>
                <details>
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Կատեգորիաների օրինակներ</summary>
                   <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-muted p-3 leading-relaxed text-muted-foreground">
{`Անիվներ:   attr_ապրանքանիշ, attr_սեզոն, attr_լայնություն, attr_պրոֆիլ, attr_չափ, attr_տրամագիծ
Յուղեր:    attr_ապրանքանիշ, attr_մածուցիկություն, attr_յուղի_տեսակ, attr_ծավալ, attr_api_դաս
Անվահեծ:   attr_ապրանքանիշ, attr_արգելակի_տեսակ, attr_առանցք, attr_նյութ`}
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
                    <th className="p-2 text-left font-medium">OEM</th>
                    <th className="p-2 text-left font-medium">Մնացորդ</th>
                    <th className="p-2 text-left font-medium">Նկար</th>
                    <th className="p-2 text-left font-medium">Ակտիվ</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((r, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="p-2 max-w-50 truncate" title={r.name || '—'}>{r.name || '—'}</td>
                      <td className="p-2 whitespace-nowrap">{r.price ? r.price.toLocaleString() : '—'} ֏</td>
                      <td className="p-2">{r.category}</td>
                      <td className="p-2 font-mono">{r.sku || '—'}</td>
                      <td className="p-2 font-mono">{r.oemNumbers?.map(o => o.code).join(', ') || '—'}</td>
                      <td className="p-2">{r.stock !== undefined ? r.stock : '—'}</td>
                      <td className="p-2">{r.images && r.images.length > 0 ? '✅' : '—'}</td>
                      <td className="p-2">{r.isActive ? '✅' : '—'}</td>
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
