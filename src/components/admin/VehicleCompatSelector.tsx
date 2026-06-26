'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CAR_DATA, CAR_BRANDS } from '@/lib/cars';
import { X, Car, Plus } from 'lucide-react';
import { useT } from '@/lib/i18n/admin';

export interface VehicleCompatEntry {
  brand: string;
  model: string;
  yearFrom: number;
  yearTo: number;
}

interface VehicleCompatSelectorProps {
  value: VehicleCompatEntry[];
  onChange: (compat: VehicleCompatEntry[]) => void;
}

export function VehicleCompatSelector({ value, onChange }: VehicleCompatSelectorProps) {
  const { t } = useT();
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');

  const models = brand ? Object.keys(CAR_DATA[brand] ?? {}) : [];
  const years = brand && model ? CAR_DATA[brand]?.[model] ?? [] : [];

  const addEntry = () => {
    if (!brand || !model || !yearFrom || !yearTo) return;
    if (Number(yearFrom) > Number(yearTo)) return;
    onChange([...value, { brand, model, yearFrom: Number(yearFrom), yearTo: Number(yearTo) }]);
    setModel('');
    setYearFrom('');
    setYearTo('');
  };

  const removeEntry = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('acmp.vehicle.intro')}</p>

      {/* Added entries */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((entry, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs shadow-sm">
              <Car className="h-3 w-3 text-primary" />
              <span className="font-medium">{entry.brand}</span>
              <span className="text-muted-foreground">{entry.model}</span>
              <span className="text-muted-foreground">{entry.yearFrom}–{entry.yearTo}</span>
              <button onClick={() => removeEntry(i)} className="ml-0.5 text-muted-foreground hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Selectors */}
      <div className="grid grid-cols-4 gap-2">
        <div>
          <Select value={brand} onValueChange={(v) => { setBrand(v != null ? String(v) : ''); setModel(''); setYearFrom(''); setYearTo(''); }}>
            <SelectTrigger className="h-10 text-xs"><SelectValue placeholder={t('acmp.vehicle.brand')} /></SelectTrigger>
            <SelectContent>{CAR_BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Select value={model} onValueChange={(v) => { setModel(v != null ? String(v) : ''); setYearFrom(''); setYearTo(''); }} disabled={!brand}>
            <SelectTrigger className="h-10 text-xs"><SelectValue placeholder={t('acmp.vehicle.model')} /></SelectTrigger>
            <SelectContent>{models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Select value={yearFrom} onValueChange={(v) => { const y = v != null ? String(v) : ''; setYearFrom(y); if (!yearTo || Number(y) > Number(yearTo)) setYearTo(y); }} disabled={!model}>
            <SelectTrigger className="h-10 text-xs"><SelectValue placeholder={t('acmp.vehicle.yearFrom')} /></SelectTrigger>
            <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Select value={yearTo} onValueChange={(v) => setYearTo(v != null ? String(v) : '')} disabled={!model}>
            <SelectTrigger className="h-10 text-xs"><SelectValue placeholder={t('acmp.vehicle.yearTo')} /></SelectTrigger>
            <SelectContent>{years.filter((y) => !yearFrom || Number(y) >= Number(yearFrom)).map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addEntry}
        disabled={!brand || !model || !yearFrom || !yearTo || Number(yearFrom) > Number(yearTo)}
        className="gap-1.5 text-xs"
      >
        <Plus className="h-3.5 w-3.5" /> {t('acmp.vehicle.add')}
      </Button>
    </div>
  );
}
