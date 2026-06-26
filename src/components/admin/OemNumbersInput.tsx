'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus } from 'lucide-react';
import { useT } from '@/lib/i18n/admin';

interface OemEntry {
  manufacturer: string;
  code: string;
}

interface OemNumbersInputProps {
  value: OemEntry[];
  onChange: (value: OemEntry[]) => void;
}

export function OemNumbersInput({ value, onChange }: OemNumbersInputProps) {
  const { t } = useT();
  const [manufacturer, setManufacturer] = useState('');
  const [code, setCode] = useState('');

  const add = () => {
    const mfgTrimmed = manufacturer.trim();
    const codeTrimmed = code.trim().toUpperCase();
    if (!mfgTrimmed || !codeTrimmed) {
      return;
    }
    if (value.some((o) => o.manufacturer === mfgTrimmed && o.code === codeTrimmed)) {
      setManufacturer('');
      setCode('');
      return;
    }
    onChange([...value, { manufacturer: mfgTrimmed, code: codeTrimmed }]);
    setManufacturer('');
    setCode('');
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <Label>{t('acmp.oem.label')}</Label>
      <div className="flex gap-2">
        <Input
          value={manufacturer}
          onChange={(e) => setManufacturer(e.target.value)}
          placeholder={t('acmp.oem.mfgPlaceholder')}
          className="h-11 flex-1"
        />
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={t('acmp.oem.codePlaceholder')}
          className="h-11 flex-1 font-mono tracking-wider"
        />
        <button
          type="button"
          onClick={add}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {value.length > 0 && (
        <div className="mt-3 space-y-2">
          {value.map((entry, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2 text-sm"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{entry.manufacturer}</span>
                <span className="font-mono text-xs text-muted-foreground">{entry.code}</span>
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
