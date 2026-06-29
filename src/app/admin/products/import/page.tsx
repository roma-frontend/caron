'use client';

import { useState, useRef } from 'react';
import { numericInputProps } from '@/lib/utils';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowLeft, Loader2, Info, File as FileIcon, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { Badge } from '@/components/ui/badge';
import { useAdminT, type AdminTFn } from '@/lib/i18n/admin';

interface ParsedRow {
  id?: string;
  name?: string;
  nameRu?: string;
  nameEn?: string;
  slug?: string;
  description?: string;
  descriptionRu?: string;
  descriptionEn?: string;
  price?: number;
  costPrice?: number;
  wholesalePrice?: number;
  wholesaleDiscount?: number;
  retailDiscount?: number;
  compareAtPrice?: number;
  qtyStep?: number;
  variantGroup?: string;
  brand?: string;
  images?: string[];
  category: string;
  sku?: string;
  atgCode?: string;
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

interface ManualRow {
  sku: string;
  atgCode: string;
  name: string;
  category: string;
  brand: string;
  type: string;
  size: string;
}

function emptyManualRow(): ManualRow {
  return { sku: '', atgCode: '', name: '', category: '', brand: '', type: '', size: '' };
}

function normalizeHeaderToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/\uFEFF/g, '')
    .replace(/["'`]/g, '')
    .replace(/[_\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeFilterToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/\uFEFF/g, '')
    .replace(/["'`]/g, '')
    .replace(/[_\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseTabularText(text: string): string[][] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.trim());
  return lines.map((line) => splitLine(line, '\t'));
}

function splitLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (!inQuotes) {
        // Treat quote as a field wrapper only at field start; otherwise keep it literal (e.g. 16").
        if (current.length === 0) {
          inQuotes = true;
          continue;
        }
        current += ch;
        continue;
      }

      // Inside quoted field: "" is an escaped quote.
      if (line[i + 1] === '"') {
        current += '"';
        i++;
        continue;
      }

      inQuotes = false;
      continue;
    }
    if (ch === sep && !inQuotes) { result.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

function parseCsv(text: string, t: AdminTFn): { headers: string[]; rows: string[][] } {
  const clean = text.replace(/^\uFEFF/, '');
  const lines: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '"') inQ = !inQ;
    if ((ch === '\n' || ch === '\r') && !inQ) {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      if (cur.trim()) lines.push(cur);
      cur = '';
    } else { cur += ch; }
  }
  if (cur.trim()) lines.push(cur);
  if (lines.length < 2) throw new Error(t('apf.csvNeedsHeaderRow'));
  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = splitLine(lines[0], sep).map((h) => h.trim().toLowerCase());
  const rows = lines
    .slice(1)
    .map((l) => splitLine(l, sep))
    .filter((cells) => cells.some((c) => c.trim() !== ''));
  return { headers, rows };
}

const BOOL_MAP: Record<string, boolean> = { yes: true, '1': true, да: true, '+': true, այո: true, no: false, '0': false, нет: false, '-': false, not: false, ոչ: false };

function normalizeAttributeKey(rawKey: string): string {
  const key = rawKey.trim().toLowerCase();
  if (key === 'չափս' || key === 'չափ' || key === 'size') return 'size';
  if (key === 'տեսակ') return 'type';
  if (key === 'ապրանքանիշ') return 'brand';
  return key;
}

function parseRow(headers: string[], values: string[], categoriesMap: Record<string, string>, t: AdminTFn): ParsedRow {
  const get = (key: string) => {
    const h = headers.map((h) => h.toLowerCase().trim());
    const idx = h.indexOf(key.toLowerCase());
    return idx >= 0 ? values[idx] || '' : '';
  };

  const catName = get('category') || get('կատեգորիա') || values[headers.findIndex(h => h.includes('cat'))] || '';
  const categoryId = categoriesMap[catName.toLowerCase().trim()];
  if (!categoryId) throw new Error(`${t('apf.category')} "${catName}" ${t('apf.notFound')}. ${t('apf.possibleCategories')} ${Object.keys(categoriesMap).join(', ')}`);

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

  // Stable id for round-trip update (export → edit → import). When present the
  // server matches by id and updates in place instead of creating a duplicate.
  const idVal = get('id') || get('_id') || get('productId') || get('product_id');
  if (idVal) result.id = idVal;

  const nameVal = get('name') || values[0];
  if (nameVal) result.name = nameVal;

  const nameRuVal = get('nameRu');
  if (nameRuVal) result.nameRu = nameRuVal;
  const nameEnVal = get('nameEn');
  if (nameEnVal) result.nameEn = nameEnVal;

  const slugVal = get('slug') || get('productslug') || (nameVal && nameVal.toLowerCase().replace(/[^a-z0-9\u0561-\u0587]+/g, '-').replace(/-+$/, ''));
  if (slugVal) result.slug = slugVal;

  const descVal = get('description');
  if (descVal) result.description = descVal;

  const descRuVal = get('descriptionRu');
  if (descRuVal) result.descriptionRu = descRuVal;
  const descEnVal = get('descriptionEn');
  if (descEnVal) result.descriptionEn = descEnVal;

  const priceVal = num('price') || num('cost');
  if (priceVal) result.price = priceVal;

  const costPriceVal = num('costPrice') || num('costprice');
  if (costPriceVal) result.costPrice = costPriceVal;

  const wpVal = num('wholesalePrice') || num('wholesale');
  if (wpVal) result.wholesalePrice = wpVal;

  const cpVal = num('compareAtPrice');
  if (cpVal) result.compareAtPrice = cpVal;

  const wholesaleDiscVal = num('wholesaleDiscount');
  if (wholesaleDiscVal) result.wholesaleDiscount = wholesaleDiscVal;

  const retailDiscVal = num('retailDiscount');
  if (retailDiscVal) result.retailDiscount = retailDiscVal;

  const qtyStepVal = num('qtyStep');
  if (qtyStepVal) result.qtyStep = qtyStepVal;

  const variantGroupVal = get('variantGroup');
  if (variantGroupVal) result.variantGroup = variantGroupVal;

  const brandVal = get('brand');
  if (brandVal) result.brand = brandVal;

  const skuVal = get('sku');
  if (skuVal) result.sku = skuVal;

  const atgVal = get('atgCode') || get('atg') || get('ատգաա');
  if (atgVal) result.atgCode = atgVal;

  const oemStr = get('oemNumbers') || get('oem');
  if (oemStr) {
    const defaultMfg = get('oemManufacturer') || get('oem_manufacturer') || get('mfg') || 'Unknown';
    const oems: Array<{ manufacturer: string; code: string }> = [];
    for (const tok of oemStr.split(/[;,]/).map((s) => s.trim()).filter(Boolean)) {
      const eq = tok.indexOf('=');
      if (eq > 0) {
        // "MFG=CODE" form (produced by the round-trip export).
        const manufacturer = tok.slice(0, eq).trim() || defaultMfg;
        const code = tok.slice(eq + 1).trim();
        if (code) oems.push({ manufacturer, code: code.toUpperCase() });
      } else {
        // Bare code(s), possibly space-separated; use the shared manufacturer.
        for (const code of tok.split(/\s+/).filter(Boolean)) {
          oems.push({ manufacturer: defaultMfg, code: code.toUpperCase() });
        }
      }
    }
    if (oems.length > 0) result.oemNumbers = oems;
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

  // A single `vehicleCompat` column (brand|model|from|to; ...) — produced by the
  // round-trip export — takes precedence over the legacy vehicle_* columns.
  const compatStr = get('vehicleCompat');
  if (compatStr) {
    const compat: Array<{ brand: string; model: string; yearFrom: number; yearTo: number }> = [];
    for (const e of compatStr.split(/[;\n]/).map((s) => s.trim()).filter(Boolean)) {
      const [brand, model, from, to] = e.split('|').map((s) => s.trim());
      if (brand && model) compat.push({ brand, model, yearFrom: Number(from) || 0, yearTo: Number(to) || 0 });
    }
    if (compat.length > 0) result.vehicleCompat = compat;
  }

  return result;
}

export default function ImportProductsPage() {
  const { t } = useAdminT();
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const categories = useQuery(api.categories.list, {});
  const filterDefs = useQuery(api.filters.listAll, {});
  const bulkCreate = useMutation(api.products.bulkCreate);
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importingRow, setImportingRow] = useState<number | null>(null);
  const [importedRows, setImportedRows] = useState<Set<number>>(new Set());
  const [done, setDone] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [manualRows, setManualRows] = useState<ManualRow[]>([emptyManualRow()]);
  const [manualImportingRow, setManualImportingRow] = useState<number | null>(null);
  const [manualImportingAll, setManualImportingAll] = useState(false);
  const [manualImportedRows, setManualImportedRows] = useState<Set<number>>(new Set());
  const [moveToManualCount, setMoveToManualCount] = useState(15);
  const [excelPasteText, setExcelPasteText] = useState('');

  const categoriesMap: Record<string, string> = {};
  if (categories) for (const c of categories) categoriesMap[c.name.toLowerCase()] = c._id;

  const categoryNameById: Record<string, string> = {};
  if (categories) for (const c of categories) categoryNameById[c._id] = c.name;

  const filterDefsByCategory: Record<string, Array<{ id: string; name: string; slug: string; options?: string[] }>> = {};
  if (filterDefs) {
    for (const f of filterDefs) {
      if (!filterDefsByCategory[f.categoryId]) filterDefsByCategory[f.categoryId] = [];
      filterDefsByCategory[f.categoryId].push({ id: f._id, name: f.name, slug: f.slug, options: f.options });
    }
  }

  const asciiFieldName = /^[\x20-\x7E]+$/;

  const resolveAttributeKeyForCategory = (categoryName: string, rawKey: string): string | null => {
    const key = rawKey.trim();
    if (!key) return null;

    const catId = categoriesMap[categoryName.toLowerCase().trim()];
    const defs = catId ? (filterDefsByCategory[catId] ?? []) : [];
    const normKey = normalizeFilterToken(key);

    const matched = defs.find((d) => {
      const slugNorm = normalizeFilterToken(d.slug);
      const nameNorm = normalizeFilterToken(d.name);
      return slugNorm === normKey || nameNorm === normKey;
    });
    if (matched) return matched.id;

    if (asciiFieldName.test(key)) return key;
    return null;
  };

  const sanitizeAttributesForCategory = (categoryName: string, attrs?: Record<string, string>): Record<string, string> | undefined => {
    if (!attrs) return undefined;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(attrs)) {
      if (!v?.trim()) continue;
      const safeKey = resolveAttributeKeyForCategory(categoryName, k);
      if (!safeKey) continue;
      out[safeKey] = v;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  };

  const getFilterOptionsForCategory = (categoryName: string, kind: 'brand' | 'type' | 'size'): string[] => {
    const catId = categoriesMap[categoryName.toLowerCase().trim()];
    if (!catId) return [];
    const defs = filterDefsByCategory[catId] ?? [];
    if (defs.length === 0) return [];

    const aliases: Record<'brand' | 'type' | 'size', string[]> = {
      brand: ['brand', 'ապրանքանիշ'],
      type: ['type', 'տեսակ'],
      size: ['size', 'չափ', 'չափս'],
    };

    const target = defs.find((d) => {
      const slugNorm = normalizeFilterToken(d.slug);
      const nameNorm = normalizeFilterToken(d.name);
      return aliases[kind].some((a) => {
        const aliasNorm = normalizeFilterToken(a);
        return slugNorm === aliasNorm || nameNorm === aliasNorm;
      });
    });

    const options = target?.options ?? [];
    return options.filter((o) => o && o.trim().length > 0);
  };

  const withCurrentValue = (options: string[], current: string): string[] => {
    const v = current.trim();
    if (!v) return options;
    if (options.some((o) => o.toLowerCase() === v.toLowerCase())) return options;
    return [v, ...options];
  };

  const isManualRowReady = (r: ManualRow) =>
    Boolean(r.sku.trim() && r.name.trim() && r.category.trim());

  const updateManualRow = (index: number, key: keyof ManualRow, value: string) => {
    setManualRows((prev) => {
      const next = [...prev];
      if (key === 'category') {
        next[index] = {
          ...next[index],
          category: value,
          // Category-specific attributes must be reset when category changes.
          brand: '',
          type: '',
          size: '',
        };
      } else {
        next[index] = { ...next[index], [key]: value };
      }
      return next;
    });
  };

  const addManualRow = () => setManualRows((prev) => [...prev, emptyManualRow()]);

  const removeManualRow = (index: number) => {
    setManualRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
    setManualImportedRows((prev) => {
      const next = new Set<number>();
      for (const i of prev) {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      }
      return next;
    });
  };

  const manualRowToBulkProduct = (row: ManualRow) => {
    const categoryId = categoriesMap[row.category.toLowerCase().trim()];
    if (!categoryId) {
      throw new Error(`${t('apf.category')} "${row.category}" ${t('apf.notFound')}`);
    }

    const attributes: Record<string, string> = {};
    if (row.brand.trim()) attributes.brand = row.brand.trim();
    if (row.type.trim()) attributes['type'] = row.type.trim();
    if (row.size.trim()) attributes.size = row.size.trim();

    const safeAttributes = sanitizeAttributesForCategory(row.category.trim(), attributes);

    return {
      category: row.category.trim(),
      categoryId: categoryId as Id<'categories'>,
      sku: row.sku.trim(),
      ...(row.atgCode.trim() ? { atgCode: row.atgCode.trim() } : {}),
      name: row.name.trim(),
      isActive: true,
      ...(safeAttributes ? { attributes: safeAttributes } : {}),
    };
  };

  const fillManualRowsFromExcelGrid = (text: string) => {
    const matrix = parseTabularText(text);
    if (matrix.length < 2) {
      toast.error(t('apf.needHeaderRow'));
      return;
    }

    const headers = matrix[0].map((h) => normalizeHeaderToken(String(h ?? '')));

    const aliases: Record<keyof ManualRow, string[]> = {
      sku: ['արտիկուլ', 'sku', 'article', 'code'],
      atgCode: ['ատգաա', 'atgaa', 'atg', 'atg code', 'atgcode'],
      name: ['անվանում', 'name', 'product name', 'ապրանք'],
      category: ['կատեգորիա', 'category', 'cat'],
      brand: ['ապրանքանիշ', 'brand', 'արտադրող'],
      type: ['տեսակ', 'type'],
      size: ['չափ', 'չափս', 'size'],
    };

    const columnIndex: Partial<Record<keyof ManualRow, number>> = {};
    (Object.keys(aliases) as Array<keyof ManualRow>).forEach((key) => {
      const idx = headers.findIndex((h) => aliases[key].includes(h));
      if (idx >= 0) columnIndex[key] = idx;
    });

    // Fallback by visual order when headers are missing/unknown.
    if (columnIndex.sku === undefined && headers.length > 0) columnIndex.sku = 0;
    if (columnIndex.atgCode === undefined && headers.length > 1) columnIndex.atgCode = 1;
    if (columnIndex.name === undefined && headers.length > 2) columnIndex.name = 2;
    if (columnIndex.category === undefined && headers.length > 3) columnIndex.category = 3;
    if (columnIndex.brand === undefined && headers.length > 4) columnIndex.brand = 4;
    if (columnIndex.type === undefined && headers.length > 5) columnIndex.type = 5;
    if (columnIndex.size === undefined && headers.length > 6) columnIndex.size = 6;

    const dataRows = matrix.slice(1).filter((r) => r.some((c) => String(c ?? '').trim() !== ''));
    const mappedRows: ManualRow[] = dataRows.map((r) => ({
      sku: columnIndex.sku !== undefined ? String(r[columnIndex.sku] ?? '').trim() : '',
      atgCode: columnIndex.atgCode !== undefined ? String(r[columnIndex.atgCode] ?? '').trim() : '',
      name: columnIndex.name !== undefined ? String(r[columnIndex.name] ?? '').trim() : '',
      category: columnIndex.category !== undefined ? String(r[columnIndex.category] ?? '').trim() : '',
      brand: columnIndex.brand !== undefined ? String(r[columnIndex.brand] ?? '').trim() : '',
      type: columnIndex.type !== undefined ? String(r[columnIndex.type] ?? '').trim() : '',
      size: columnIndex.size !== undefined ? String(r[columnIndex.size] ?? '').trim() : '',
    }));

    if (mappedRows.length === 0) {
      toast.error(t('apf.noDataRows'));
      return;
    }

    setManualRows(mappedRows);
    setManualImportedRows(new Set());
    setManualImportingRow(null);
    toast.success(`${t('apf.excelFilled')} ${mappedRows.length} ${t('apf.rowsWord')}`);
  };

  const handleExcelManualPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text/plain');
    if (!text?.trim()) return;
    e.preventDefault();
    setExcelPasteText(text);
    fillManualRowsFromExcelGrid(text);
  };

  const parsedToManualRow = (r: ParsedRow): ManualRow => {
    const attrs = r.attributes ?? {};
    return {
      sku: r.sku ?? '',
      atgCode: r.atgCode ?? '',
      name: r.name ?? '',
      category: r.category ?? '',
      brand: attrs['ապրանքանիշ'] ?? attrs['brand'] ?? '',
      type: attrs['type'] ?? attrs['տեսակ'] ?? '',
      size: attrs['չափ'] ?? attrs['size'] ?? '',
    };
  };

  const handleMoveParsedToManual = () => {
    if (!parsed || parsed.length === 0) {
      toast.error(t('apf.loadDataFirst'));
      return;
    }
    const n = Math.max(1, Math.min(moveToManualCount || 1, parsed.length));
    const nextRows = parsed.slice(0, n).map(parsedToManualRow);
    setManualRows(nextRows.length > 0 ? nextRows : [emptyManualRow()]);
    setManualImportedRows(new Set());
    setManualImportingRow(null);
    toast.success(`${t('apf.moved')} ${nextRows.length} ${t('apf.rowsWord')} ${t('apf.intoBulkForm')}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleManualImportOne = async (rowIndex: number) => {
    if (!sessionToken) return;
    const row = manualRows[rowIndex];
    if (!isManualRowReady(row)) {
      toast.error(`${t('apf.row')} ${rowIndex + 1}: ${t('apf.fillSkuNameCategory')}`);
      return;
    }
    setManualImportingRow(rowIndex);
    try {
      const product = manualRowToBulkProduct(row);
      await bulkCreate({ sessionToken, products: [product] });
      setManualImportedRows((prev) => new Set(prev).add(rowIndex));
      toast.success(`${t('apf.row')} ${rowIndex + 1} ${t('apf.addedRow')}`);
    } catch (e) {
      toast.error(`${t('apf.row')} ${rowIndex + 1}: ${e instanceof Error ? e.message : t('apf.errorWord')}`);
    } finally {
      setManualImportingRow(null);
    }
  };

  const handleManualImportAll = async () => {
    if (!sessionToken) return;
    const candidates = manualRows
      .map((row, idx) => ({ row, idx }))
      .filter(({ row, idx }) => isManualRowReady(row) && !manualImportedRows.has(idx));

    if (candidates.length === 0) {
      toast.error(t('apf.noReadyRows'));
      return;
    }

    setManualImportingAll(true);
    try {
      const products = candidates.map(({ row }) => manualRowToBulkProduct(row));
      await bulkCreate({ sessionToken, products });
      setManualImportedRows((prev) => {
        const next = new Set(prev);
        for (const { idx } of candidates) next.add(idx);
        return next;
      });
      toast.success(`${t('apf.addedCount')} ${candidates.length} ${t('apf.productWord')}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('apf.unknownError'));
    } finally {
      setManualImportingAll(false);
    }
  };

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
      toast.error(t('apf.catsNotLoaded'));
      return;
    }
    const { headers, rows } = parseCsv(text, t);
    const mapped: ParsedRow[] = [];
    const errs: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      try {
        mapped.push(parseRow(headers, rows[i], categoriesMap, t));
      } catch (e) {
        errs.push(`${t('apf.row')} ${i + 2}: ${e instanceof Error ? e.message : t('apf.errorWord')}`);
      }
    }
    setParsed(mapped);
    setErrors(errs);
    if (mapped.length === 0) { toast.error(t('apf.noRowsFound')); return; }
    toast.success(`${t('apf.found')} ${mapped.length} ${t('apf.productWord')}${errs.length > 0 ? `, ${errs.length} ${t('apf.errLower')}` : ''}`);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.name.endsWith('.xlsx')) {
      toast.error(t('apf.xlsxDisabled'));
      e.target.value = '';
      return;
    }
    setErrors([]);
    setParsed(null);
    setDone(false);
    setImportedRows(new Set());
    setImportingRow(null);
    setPasteText('');
    try {
      const text = await decodeFile(file);
      parseText(text);
    } catch (e) {
      toast.error(`${t('apf.errorWord')}: ${e instanceof Error ? e.message : t('apf.formatExpected')}`);
    }
  };

  const handlePaste = () => {
    if (!pasteText.trim()) { toast.error(t('apf.pasteData')); return; }
    setErrors([]);
    setParsed(null);
    setDone(false);
    setImportedRows(new Set());
    setImportingRow(null);
    parseText(pasteText);
  };

  const handleImport = async () => {
    if (!parsed || !sessionToken) return;
    setImporting(true);
    try {
      type BulkProduct = Parameters<typeof bulkCreate>[0]['products'][number];
      type BulkProductWithAtg = BulkProduct & {
        atgCode?: string;
        id?: Id<'products'>;
        nameRu?: string;
        nameEn?: string;
        descriptionRu?: string;
        descriptionEn?: string;
        wholesaleDiscount?: number;
        qtyStep?: number;
        brand?: string;
      };
      const toBulkProduct = (r: ParsedRow): BulkProductWithAtg => {
        const p: BulkProductWithAtg = {
          category: r.category,
          categoryId: categoriesMap[r.category.toLowerCase().trim()] as Id<'categories'>,
        };
        // Передаем только заполненные поля
        if (r.name !== undefined) p.name = r.name;
        if (r.slug !== undefined) p.slug = r.slug;
        if (r.description !== undefined) p.description = r.description;
        if (r.price !== undefined) p.price = r.price;
        if (r.costPrice !== undefined) p.costPrice = r.costPrice;
        if (r.wholesalePrice !== undefined) p.wholesalePrice = r.wholesalePrice;
        if (r.compareAtPrice !== undefined) p.compareAtPrice = r.compareAtPrice;
        if (r.sku !== undefined) p.sku = r.sku;
        if (r.atgCode !== undefined) p.atgCode = r.atgCode;
        if (r.oemNumbers !== undefined && r.oemNumbers.length > 0) p.oemNumbers = r.oemNumbers;
        if (r.stock !== undefined) p.stock = r.stock;
        if (r.isActive !== undefined) p.isActive = r.isActive;
        if (r.isFeatured !== undefined) p.isFeatured = r.isFeatured;
        if (r.showInPromotions !== undefined) p.showInPromotions = r.showInPromotions;
        if (r.seoTitle !== undefined) p.seoTitle = r.seoTitle;
        if (r.seoDescription !== undefined) p.seoDescription = r.seoDescription;
        if (r.images !== undefined && r.images.length > 0) p.images = r.images;
        const safeAttrs = sanitizeAttributesForCategory(r.category, r.attributes);
        if (safeAttrs) p.attributes = safeAttrs;
        if (r.vehicleCompat !== undefined && r.vehicleCompat.length > 0) p.vehicleCompat = r.vehicleCompat;
        if (r.id !== undefined) p.id = r.id as Id<'products'>;
        if (r.nameRu !== undefined) p.nameRu = r.nameRu;
        if (r.nameEn !== undefined) p.nameEn = r.nameEn;
        if (r.descriptionRu !== undefined) p.descriptionRu = r.descriptionRu;
        if (r.descriptionEn !== undefined) p.descriptionEn = r.descriptionEn;
        if (r.retailDiscount !== undefined) p.retailDiscount = r.retailDiscount;
        if (r.wholesaleDiscount !== undefined) p.wholesaleDiscount = r.wholesaleDiscount;
        if (r.qtyStep !== undefined) p.qtyStep = r.qtyStep;
        if (r.variantGroup !== undefined) p.variantGroup = r.variantGroup;
        if (r.brand !== undefined) p.brand = r.brand;
        return p;
      };
      const products: BulkProductWithAtg[] = parsed.map(toBulkProduct);
      const CHUNK = 50;
      let lastResult = "";
      for (let i = 0; i < products.length; i += CHUNK) {
        lastResult = await bulkCreate({ sessionToken, products: products.slice(i, i + CHUNK) });
        setImportedRows(new Set(Array.from({ length: Math.min(i + CHUNK, products.length) }, (_, idx) => idx)));
      }
      toast.success(lastResult);
      setDone(true);
      setImportedRows(new Set(parsed.map((_, idx) => idx)));
    } catch (e) {
      toast.error(`${t('apf.importError')}: ${e instanceof Error ? e.message : t('apf.unknownError')}`);
    } finally { setImporting(false); }
  };

  const handleImportOne = async (rowIndex: number) => {
    if (!parsed || !sessionToken || importedRows.has(rowIndex)) return;
    setImportingRow(rowIndex);
    try {
      type BulkProduct = Parameters<typeof bulkCreate>[0]['products'][number];
      type BulkProductWithAtg = BulkProduct & {
        atgCode?: string;
        id?: Id<'products'>;
        nameRu?: string;
        nameEn?: string;
        descriptionRu?: string;
        descriptionEn?: string;
        wholesaleDiscount?: number;
        qtyStep?: number;
        brand?: string;
      };
      const r = parsed[rowIndex];
      const p: BulkProductWithAtg = {
        category: r.category,
        categoryId: categoriesMap[r.category.toLowerCase().trim()] as Id<'categories'>,
      };
      if (r.name !== undefined) p.name = r.name;
      if (r.slug !== undefined) p.slug = r.slug;
      if (r.description !== undefined) p.description = r.description;
      if (r.price !== undefined) p.price = r.price;
      if (r.costPrice !== undefined) p.costPrice = r.costPrice;
      if (r.wholesalePrice !== undefined) p.wholesalePrice = r.wholesalePrice;
      if (r.compareAtPrice !== undefined) p.compareAtPrice = r.compareAtPrice;
      if (r.sku !== undefined) p.sku = r.sku;
      if (r.atgCode !== undefined) p.atgCode = r.atgCode;
      if (r.oemNumbers !== undefined && r.oemNumbers.length > 0) p.oemNumbers = r.oemNumbers;
      if (r.stock !== undefined) p.stock = r.stock;
      if (r.isActive !== undefined) p.isActive = r.isActive;
      if (r.isFeatured !== undefined) p.isFeatured = r.isFeatured;
      if (r.showInPromotions !== undefined) p.showInPromotions = r.showInPromotions;
      if (r.seoTitle !== undefined) p.seoTitle = r.seoTitle;
      if (r.seoDescription !== undefined) p.seoDescription = r.seoDescription;
      if (r.images !== undefined && r.images.length > 0) p.images = r.images;
      const safeAttrs = sanitizeAttributesForCategory(r.category, r.attributes);
      if (safeAttrs) p.attributes = safeAttrs;
      if (r.vehicleCompat !== undefined && r.vehicleCompat.length > 0) p.vehicleCompat = r.vehicleCompat;
      if (r.id !== undefined) p.id = r.id as Id<'products'>;
      if (r.nameRu !== undefined) p.nameRu = r.nameRu;
      if (r.nameEn !== undefined) p.nameEn = r.nameEn;
      if (r.descriptionRu !== undefined) p.descriptionRu = r.descriptionRu;
      if (r.descriptionEn !== undefined) p.descriptionEn = r.descriptionEn;
      if (r.retailDiscount !== undefined) p.retailDiscount = r.retailDiscount;
      if (r.wholesaleDiscount !== undefined) p.wholesaleDiscount = r.wholesaleDiscount;
      if (r.qtyStep !== undefined) p.qtyStep = r.qtyStep;
      if (r.variantGroup !== undefined) p.variantGroup = r.variantGroup;
      if (r.brand !== undefined) p.brand = r.brand;

      await bulkCreate({ sessionToken, products: [p] });
      setImportedRows((prev) => new Set(prev).add(rowIndex));
      toast.success(`${t('apf.row')} ${rowIndex + 2}: ${t('apf.imported')}`);
    } catch (e) {
      toast.error(`${t('apf.row')} ${rowIndex + 2}: ${e instanceof Error ? e.message : t('apf.errorWord')}`);
    } finally {
      setImportingRow(null);
    }
  };

  const catKeys = Object.keys(categoriesMap);

  // Virtualize the preview table body so importing a large CSV (thousands of
  // rows) renders only the visible rows instead of one <tr> per row.
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: parsed?.length ?? 0,
    getScrollElement: () => previewScrollRef.current,
    estimateSize: () => 37,
    overscan: 12,
  });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/products"><Button variant="ghost" size="icon-sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold">{t('apf.importFromCsv')}</h1>
      </div>

      <div className="mb-6 flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs leading-relaxed">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>{t('apf.idColumnHint')}</p>
      </div>

      <Card className="mb-6 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex flex-col items-start justify-between gap-2 text-base sm:flex-row sm:items-center">
            <span className="flex items-center gap-2"><FileIcon className="h-5 w-5 text-primary" /> {t('apf.bulkAddManual')}</span>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <Button size="sm" variant="outline" className="gap-1" onClick={addManualRow}><Plus className="h-3.5 w-3.5" /> {t('apf.row')}</Button>
              <Button
                size="sm"
                className="gap-1"
                onClick={handleManualImportAll}
                disabled={manualImportingAll || manualRows.filter((r, i) => isManualRowReady(r) && !manualImportedRows.has(i)).length <= 1}
              >
                {manualImportingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {t('apf.addAll')}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
            <p className="mb-2 text-xs font-medium">{t('apf.excelCopyPaste')}</p>
            <textarea
              value={excelPasteText}
              onChange={(e) => setExcelPasteText(e.target.value)}
              onPaste={handleExcelManualPaste}
              placeholder={t('apf.excelPastePlaceholder')}
              className="h-24 w-full rounded-md border bg-background p-2 text-xs"
            />
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => fillManualRowsFromExcelGrid(excelPasteText)} disabled={!excelPasteText.trim()}>
                {t('apf.putIntoForm')}
              </Button>
            </div>
          </div>

          <div className="hidden rounded-lg border md:block overflow-x-auto overflow-y-visible">
            <table className="text-xs border-collapse" style={{tableLayout: 'fixed'}}>
              <thead className="bg-muted">
                <tr className="border-b">
                  <th className="p-2 text-left font-medium w-[70px]">{t('apf.addBtn')}</th>
                  <th className="p-2 text-left font-medium w-[90px]">{t('apf.sku')}</th>
                  <th className="p-2 text-left font-medium w-[90px]">{t('apf.atgaa')}</th>
                  <th className="p-2 text-left font-medium w-[90px]">{t('apf.name')}</th>
                  <th className="p-2 text-left font-medium w-[130px]">{t('apf.category')}</th>
                  <th className="p-2 text-left font-medium w-[130px]">{t('apf.brand')}</th>
                  <th className="p-2 text-left font-medium w-[130px]">{t('apf.type')}</th>
                  <th className="p-2 text-left font-medium w-[100px]">{t('apf.size')}</th>
                  <th className="p-2 text-left font-medium w-[50px]">{t('apf.delete')}</th>
                </tr>
              </thead>
              <tbody>
                {manualRows.map((row, i) => {
                  const rowReady = isManualRowReady(row);
                  const alreadyAdded = manualImportedRows.has(i);
                  const brandOptions = withCurrentValue(getFilterOptionsForCategory(row.category, 'brand'), row.brand);
                  const typeOptions = withCurrentValue(getFilterOptionsForCategory(row.category, 'type'), row.type);
                  const sizeOptions = withCurrentValue(getFilterOptionsForCategory(row.category, 'size'), row.size);
                  return (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-2 w-[70px]">
                        <Button
                          size="sm"
                          disabled={!rowReady || alreadyAdded || manualImportingAll || manualImportingRow === i}
                          onClick={() => handleManualImportOne(i)}
                          className="h-7 px-2 text-[11px]"
                          variant={alreadyAdded ? 'outline' : 'default'}
                        >
                          {manualImportingRow === i ? <Loader2 className="h-3 w-3 animate-spin" /> : alreadyAdded ? t('apf.added') : t('apf.addBtn')}
                        </Button>
                      </td>
                      <td className="p-2 w-[90px]"><input className="h-8 w-full rounded-md border bg-background px-2 text-xs" value={row.sku} onChange={(e) => updateManualRow(i, 'sku', e.target.value)} placeholder="232325" /></td>
                      <td className="p-2 w-[90px]"><input className="h-8 w-full rounded-md border bg-background px-2 text-xs" value={row.atgCode} onChange={(e) => updateManualRow(i, 'atgCode', e.target.value)} placeholder="8708" /></td>
                      <td className="p-2 w-[90px]"><input className="h-8 w-full rounded-md border bg-background px-2 text-xs" value={row.name} onChange={(e) => updateManualRow(i, 'name', e.target.value)} placeholder={t('apf.namePlaceholder')} /></td>
                      <td className="p-2 w-[130px]">
                        <select
                          className="h-8 w-full rounded-md border bg-background px-2 pr-8 text-xs"
                          value={row.category}
                          onChange={(e) => updateManualRow(i, 'category', e.target.value)}
                        >
                          <option value="">{t('apf.category')}</option>
                          {categories?.map((c) => (
                            <option key={c._id} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 w-[130px]">
                        <select
                          className="h-8 w-full rounded-md border bg-background px-2 pr-8 text-xs"
                          value={row.brand}
                          onChange={(e) => updateManualRow(i, 'brand', e.target.value)}
                        >
                          <option value="">{row.category ? t('apf.brand') : t('apf.selectCategory')}</option>
                          {brandOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 w-[130px]">
                        <select
                          className="h-8 w-full rounded-md border bg-background px-2 pr-8 text-xs"
                          value={row.type}
                          onChange={(e) => updateManualRow(i, 'type', e.target.value)}
                        >
                          <option value="">{row.category ? t('apf.type') : t('apf.selectCategory')}</option>
                          {typeOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 w-[100px]">
                        <select
                          className="h-8 w-full rounded-md border bg-background px-2 pr-8 text-xs"
                          value={row.size}
                          onChange={(e) => updateManualRow(i, 'size', e.target.value)}
                        >
                          <option value="">{row.category ? t('apf.size') : t('apf.selectCategory')}</option>
                          {sizeOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 w-[50px]">
                        <Button size="icon-sm" variant="ghost" onClick={() => removeManualRow(i)} disabled={manualRows.length <= 1}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {manualRows.map((row, i) => {
              const rowReady = isManualRowReady(row);
              const alreadyAdded = manualImportedRows.has(i);
              const brandOptions = withCurrentValue(getFilterOptionsForCategory(row.category, 'brand'), row.brand);
              const typeOptions = withCurrentValue(getFilterOptionsForCategory(row.category, 'type'), row.type);
              const sizeOptions = withCurrentValue(getFilterOptionsForCategory(row.category, 'size'), row.size);
              return (
                <div key={i} className="rounded-lg border bg-muted/20 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">{t('apf.row')} {i + 1}</span>
                    <Button size="icon-sm" variant="ghost" onClick={() => removeManualRow(i)} disabled={manualRows.length <= 1}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <input className="h-9 w-full rounded-md border bg-background px-2 text-xs" value={row.sku} onChange={(e) => updateManualRow(i, 'sku', e.target.value)} placeholder={t('apf.skuLower')} />
                    <input className="h-9 w-full rounded-md border bg-background px-2 text-xs" value={row.atgCode} onChange={(e) => updateManualRow(i, 'atgCode', e.target.value)} placeholder={t('apf.atgaa')} />
                    <input className="h-9 w-full rounded-md border bg-background px-2 text-xs" value={row.name} onChange={(e) => updateManualRow(i, 'name', e.target.value)} placeholder={t('apf.nameLower')} />
                    <select className="h-9 w-full rounded-md border bg-background px-2 pr-8 text-xs" value={row.category} onChange={(e) => updateManualRow(i, 'category', e.target.value)}>
                      <option value="">{t('apf.category')}</option>
                      {categories?.map((c) => (
                        <option key={c._id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    <select className="h-9 w-full rounded-md border bg-background px-2 pr-8 text-xs" value={row.brand} onChange={(e) => updateManualRow(i, 'brand', e.target.value)}>
                      <option value="">{row.category ? t('apf.brandLower') : t('apf.selectCategory')}</option>
                      {brandOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <select className="h-9 w-full rounded-md border bg-background px-2 pr-8 text-xs" value={row.type} onChange={(e) => updateManualRow(i, 'type', e.target.value)}>
                      <option value="">{row.category ? t('apf.typeLower') : t('apf.selectCategory')}</option>
                      {typeOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <select className="h-9 w-full rounded-md border bg-background px-2 pr-8 text-xs" value={row.size} onChange={(e) => updateManualRow(i, 'size', e.target.value)}>
                      <option value="">{row.category ? t('apf.sizeLower') : t('apf.selectCategory')}</option>
                      {sizeOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <Button
                    size="sm"
                    className="mt-3 w-full"
                    disabled={!rowReady || alreadyAdded || manualImportingAll || manualImportingRow === i}
                    onClick={() => handleManualImportOne(i)}
                    variant={alreadyAdded ? 'outline' : 'default'}
                  >
                    {manualImportingRow === i ? <Loader2 className="h-3 w-3 animate-spin" /> : alreadyAdded ? t('apf.added') : t('apf.addBtn')}
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="mt-2 text-xs text-muted-foreground">
            {t('apf.requiredFieldsNote')}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Upload className="h-5 w-5 text-primary" /> {t('apf.uploadFile')}</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-4 rounded-lg border-2 border-dashed border-muted-foreground/30 p-8 text-center hover:border-primary/50 transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
            <FileSpreadsheet className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium">{t('apf.clickToSelectCsv')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('apf.exportedFromExcel')}</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleFile} />

          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">{t('apf.orPasteText')}</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={t('apf.pastePlaceholder')}
              className="w-full h-28 rounded-lg border border-input bg-background p-3 text-xs font-mono resize-y"
            />
            <Button size="sm" variant="outline" className="mt-2 gap-1 text-xs" onClick={handlePaste} disabled={!pasteText.trim()}>
              <Upload className="h-3 w-3" /> {t('apf.parse')}
            </Button>
          </div>

          {/* Column reference */}
          <details className="group">
            <summary className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
              <Info className="h-3.5 w-3.5" />
              {t('apf.fullColumnList')}
            </summary>
            <div className="mt-3 space-y-4 text-xs">
              <div>
                <p className="mb-1.5 font-semibold text-foreground">{t('apf.mainColumns')}</p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {[
                    ['name', t('apf.hintName')],
                    ['slug', t('apf.hintSlug')],
                    ['description', t('apf.productDescription')],
                    ['price', t('apf.hintPrice')],
                    ['wholesalePrice', t('apf.hintWholesale')],
                    ['compareAtPrice', t('apf.hintCompareAt')],
                    ['stock', t('apf.hintStock')],
                    ['sku', t('apf.hintSku')],
                    ['atgCode', t('apf.hintAtg')],
                    ['oemNumbers / oem', t('apf.hintOem')],
                    ['category', t('apf.hintCategory')],
                    ['isActive', t('apf.hintIsActive')],
                    ['isFeatured', t('apf.hintIsFeatured')],
                    ['showInPromotions', t('apf.hintShowPromo')],
                    ['images', t('apf.hintImages')],
                    ['seoTitle', t('apf.seoTitle')],
                    ['seoDescription', t('apf.seoDescription')],
                  ].map(([col, hint]) => (
                    <div key={col} className="flex gap-2 rounded-lg border bg-muted/30 px-3 py-1.5">
                      <code className="shrink-0 font-bold text-primary">{col}</code>
                      <span className="text-muted-foreground">{hint}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 font-semibold text-foreground">{t('apf.attrsFilters')}</p>
                <p className="mb-2 text-muted-foreground">{t('apf.eachFilterAddColumn')} <code className="text-primary">attr_ՖիլտրիԱնվանում</code></p>
                <p className="mb-2 text-muted-foreground">{t('apf.multiselectHint')}</p>
                <p className="mb-2 text-muted-foreground">{t('apf.sizeUse')} <code className="text-primary">attr_չափ</code> ({t('apf.also')} <code className="text-primary">attr_չափս</code> {t('apf.and')} <code className="text-primary">attr_size</code> {t('apf.savedAs')} <code className="text-primary">չափ</code>)</p>
                <details>
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">{t('apf.categoryExamples')}</summary>
                   <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-muted p-3 leading-relaxed text-muted-foreground">
{`Անիվներ:   attr_ապրանքանիշ, attr_սեզոն, attr_լայնություն, attr_պրոֆիլ, attr_չափ, attr_տրամագիծ
Յուղեր:    attr_ապրանքանիշ, attr_մածուցիկություն, attr_յուղի_տեսակ, attr_ծավալ, attr_api_դաս
Անվահեծ:   attr_ապրանքանիշ, attr_արգելակի_տեսակ, attr_առանցք, attr_նյութ`}
                  </pre>
                </details>
              </div>
              <div>
                <p className="mb-1.5 font-semibold text-foreground">{t('apf.vehicleCompatTitle')}</p>
                <p className="text-muted-foreground">{t('apf.addColumns')} <code className="text-primary">vehicle_brand</code>, <code className="text-primary">vehicle_model</code>, <code className="text-primary">vehicle_yearFrom</code>, <code className="text-primary">vehicle_yearTo</code></p>
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
              <span className="text-sm font-medium">{errors.length} {t('apf.errLower')}</span>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">{errors.map((e, i) => <p key={i} className="text-xs text-muted-foreground">{e}</p>)}</div>
          </CardContent>
        </Card>
      )}

      {parsed && parsed.length > 0 && (
        <Card className="mb-6 overflow-visible">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            {t('apf.productGen')} ({parsed.length} {t('apf.preview')})
          </CardTitle></CardHeader>
          <CardContent>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">{t('apf.imported2')}: {importedRows.size} / {parsed.length}</div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  {...numericInputProps(false)}
                  min={1}
                  max={parsed.length}
                  value={moveToManualCount}
                  onChange={(e) => setMoveToManualCount(Number(e.target.value) || 1)}
                  className="h-8 w-20 rounded-md border bg-background px-2 text-xs"
                />
                <Button size="sm" variant="outline" onClick={handleMoveParsedToManual}>
                  {t('apf.moveToBulk')}
                </Button>
                <Button onClick={handleImport} disabled={importing || done} size="sm" className="gap-2">
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {importing ? t('apf.importing') : `${t('apf.addAll')} (${parsed.length})`}
                </Button>
              </div>
            </div>
            <div ref={previewScrollRef} className="max-h-80 overflow-x-auto overflow-y-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-muted">
                  <tr className="border-b">
                    <th className="p-2 text-left font-medium">{t('apf.addBtn')}</th>
                    <th className="p-2 text-left font-medium">{t('apf.name')}</th>
                    <th className="p-2 text-left font-medium">{t('apf.priceCol')}</th>
                    <th className="p-2 text-left font-medium">{t('apf.category')}</th>
                    <th className="p-2 text-left font-medium">SKU</th>
                    <th className="p-2 text-left font-medium">OEM</th>
                    <th className="p-2 text-left font-medium">{t('apf.stockCol')}</th>
                    <th className="p-2 text-left font-medium">{t('apf.imageCol')}</th>
                    <th className="p-2 text-left font-medium">{t('apf.activeCol')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const virtualRows = rowVirtualizer.getVirtualItems();
                    const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
                    const paddingBottom = virtualRows.length > 0
                      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
                      : 0;
                    return (
                      <>
                        {paddingTop > 0 && <tr style={{ height: paddingTop }}><td colSpan={9} /></tr>}
                        {virtualRows.map((vRow) => {
                          const i = vRow.index;
                          const r = parsed![i];
                          return (
                            <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                              <td className="p-2">
                                <Button
                                  size="sm"
                                  variant={importedRows.has(i) ? 'outline' : 'default'}
                                  disabled={importing || importingRow === i || importedRows.has(i)}
                                  onClick={() => handleImportOne(i)}
                                  className="h-7 px-2 text-[11px]"
                                >
                                  {importingRow === i ? <Loader2 className="h-3 w-3 animate-spin" /> : importedRows.has(i) ? t('apf.added') : t('apf.addBtn')}
                                </Button>
                              </td>
                              <td className="p-2 max-w-50 truncate" title={r.name || '—'}>{r.name || '—'}</td>
                              <td className="p-2 whitespace-nowrap">{r.price ? r.price.toLocaleString() : '—'} ֏</td>
                              <td className="p-2">{r.category}</td>
                              <td className="p-2 font-mono">{r.sku || '—'}</td>
                              <td className="p-2 font-mono">{r.oemNumbers?.map(o => o.code).join(', ') || '—'}</td>
                              <td className="p-2">{r.stock !== undefined ? r.stock : '—'}</td>
                              <td className="p-2">{r.images && r.images.length > 0 ? '✅' : '—'}</td>
                              <td className="p-2">{r.isActive ? '✅' : '—'}</td>
                            </tr>
                          );
                        })}
                        {paddingBottom > 0 && <tr style={{ height: paddingBottom }}><td colSpan={9} /></tr>}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-amber-600">
              <Info className="h-3.5 w-3.5" />
              {t('apf.attrsInfo')}
            </div>

            <Button onClick={handleImport} disabled={importing || done} size="lg" className="mt-4 w-full gap-2">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? <CheckCircle2 className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
              {importing ? t('apf.importing') : done ? t('apf.importedDone') : `${t('apf.addAll')} (${parsed.length})`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Category reference */}
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer hover:text-foreground">{t('apf.knownCategories')}</summary>
        <div className="mt-2 flex flex-wrap gap-1.5">{catKeys.map((k) => <Badge key={k} variant="outline" className="text-[10px]">{k}</Badge>)}</div>
      </details>
    </div>
  );
}
