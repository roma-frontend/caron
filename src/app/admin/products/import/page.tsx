'use client';

import { useState, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { Id } from '../../../../../convex/_generated/dataModel';

interface CsvRow {
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  category: string;
  sku?: string;
  stock: number;
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length < 2) throw new Error('CSV должен содержать заголовок и минимум 1 строку');
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1).map((l) => l.split(',').map((c) => c.trim()));
  return { headers, rows };
}

function mapRow(headers: string[], values: string[], categoriesMap: Record<string, string>): CsvRow {
  const get = (key: string) => {
    const i = headers.indexOf(key);
    return i >= 0 ? values[i] || '' : '';
  };
  const catName = get('category') || get('կատեգորիա') || get('categoryname');
  const categoryId = categoriesMap[catName.toLowerCase()];
  if (!categoryId) throw new Error(`Կատեգորիա "${catName}" չի գտնվել`);
  return {
    name: get('name') || get('անվանում') || get('productname') || get('product'),
    slug: get('slug') || get('url') || get('productslug'),
    description: get('description') || get('նկարագրություն') || get('desc'),
    price: Number(get('price') || get('գին') || get('cost')) || 0,
    compareAtPrice: Number(get('compareatprice') || get('oldprice') || get('հին գին') || '') || undefined,
    category: catName,
    sku: get('sku') || get('արտիկուլ') || get('article') || undefined,
    stock: Number(get('stock') || get('քանակ') || get('quantity') || '1') || 1,
  };
}

export default function ImportProductsPage() {
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const categories = useQuery(api.categories.list, {});
  const bulkCreate = useMutation(api.products.bulkCreate);
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<CsvRow[] | null>(null);
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
      const mapped: CsvRow[] = [];
      const errs: string[] = [];
      for (let i = 0; i < rows.length; i++) {
        try {
          mapped.push(mapRow(headers, rows[i], categoriesMap));
        } catch (e) {
          errs.push(`Տող ${i + 2}: ${e instanceof Error ? e.message : 'Սխալ'}`);
        }
      }
      if (mapped.length === 0) { toast.error('Չհաջողվեց հայտնաբերել որևէ ապրանք'); return; }
      setParsed(mapped);
      if (errs.length > 0) setErrors(errs);
      toast.success(`Հայտնաբերվել է ${mapped.length} ապրանքի${errs.length > 0 ? `, ${errs.length} սխալ` : ''}`);
    } catch (e) {
      toast.error(`Ներկրման սխալ: ${e instanceof Error ? e.message : 'Սխալ ձևաչափ'}`);
    }
  };

  const handleImport = async () => {
    if (!parsed || !sessionToken) return;
    setImporting(true);
    try {
      const products: Parameters<typeof bulkCreate>[0]['products'] = parsed.map((r) => ({
        name: r.name,
        slug: r.slug || r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, ''),
        description: r.description,
        price: r.price,
        compareAtPrice: r.compareAtPrice || undefined,
        categoryId: categoriesMap[r.category.toLowerCase()] as Id<'categories'>,
        sku: r.sku || undefined,
        stock: r.stock,
        isActive: true,
        isFeatured: false,
      }));
      const result = await bulkCreate({ sessionToken, products });
      toast.success(result);
      setDone(true);
    } catch (e) {
      toast.error(`Ներկրման սխալ: ${e instanceof Error ? e.message : 'Անհայտ սխալ'}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/products"><Button variant="ghost" size="icon-sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold">Ներկրել CSV ֆայլից</h1>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Upload className="h-5 w-5 text-primary" />Ներկրել Excel ֆայլ</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-4 rounded-lg border-2 border-dashed border-muted-foreground/30 p-8 text-center hover:border-primary/50 transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
            <FileSpreadsheet className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium">Սեղմեք, որպեսզի ընտրեք CSV ֆայլ</p>
            <p className="mt-1 text-xs text-muted-foreground">Excel-ից արտահանված (Պահպանել որպես → CSV UTF-8)</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleFile} />

          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">CSV ձևաչափ: սովորական սյունակներ</summary>
            <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-muted p-3 leading-relaxed">
{`name, slug, price, category, stock, description, compareAtPrice, sku
"Тормозные колодки Brembo", brembo-p85075, 28000, "Կոճղակ", 20, "Описание...", 32000, BRK-001`}
            </pre>
            <p className="mt-2">Կատեգորիան պետք է համընկնի սիստեմայի անվանման հետ (Անիվներ, Նյութեր, Ֆիլտրեր...)</p>
          </details>
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <Card className="mb-6 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">{errors.length} տողեր սխալներով</span>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {errors.map((e, i) => <p key={i} className="text-xs text-muted-foreground">{e}</p>)}
            </div>
          </CardContent>
        </Card>
      )}

      {parsed && parsed.length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Նախադիտում ({parsed.length} ապրանքներ)
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
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((r, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="p-2 max-w-[200px] truncate">{r.name}</td>
                      <td className="p-2 whitespace-nowrap">{r.price.toLocaleString()} ֏</td>
                      <td className="p-2">{r.category}</td>
                      <td className="p-2 font-mono">{r.sku || '—'}</td>
                      <td className="p-2">{r.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button onClick={handleImport} disabled={importing || done} size="lg" className="mt-4 w-full gap-2">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? <CheckCircle2 className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
              {importing ? 'Ներկրվում է...' : done ? 'Ներկրվել է' : `Ներկրել ${parsed.length} ապրանք`}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
