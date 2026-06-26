'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LoaderInline } from '@/components/ui/loader';
import { Card } from '@/components/ui/card';
import { Car, Search, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useT } from '@/lib/i18n/admin';

interface VinResult {
  vin: string;
  make: string | null;
  model: string | null;
  year: number | null;
  engine: string | null;
  engineHP: string | null;
  displacement: string | null;
  fuelType: string | null;
  driveType: string | null;
  bodyClass: string | null;
  transmission: string | null;
  trim: string | null;
  plantCountry: string | null;
  manufacturer: string | null;
  searchQuery: string;
}

export function VinDecoder() {
  const { t } = useT();
  const router = useRouter();
  const [vin, setVin] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VinResult | null>(null);
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const decode = async () => {
    const trimmed = vin.trim().toUpperCase();
    if (trimmed.length !== 17) {
      setError(t('pg.vin.enter17'));
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch(`/api/vin?vin=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('pg.vin.unknownError'));
      } else {
        setResult(data);
      }
    } catch {
      setError(t('pg.vin.networkError'));
    } finally {
      setLoading(false);
    }
  };

  const searchParts = () => {
    if (result?.searchQuery) {
      router.push(`/products?q=${encodeURIComponent(result.searchQuery)}`);
    }
  };

  const mainFields = [
    { label: t('pg.common.brand'), value: result?.make },
    { label: t('pg.common.model'), value: result?.model },
    { label: t('pg.common.year'), value: result?.year },
    { label: t('pg.vin.engine'), value: result?.engine },
    { label: t('pg.vin.displacement'), value: result?.displacement },
    { label: t('pg.vin.fuelType'), value: result?.fuelType },
  ].filter((f) => f.value);

  const extraFields = [
    { label: t('pg.vin.hp'), value: result?.engineHP },
    { label: t('pg.vin.transmission'), value: result?.transmission },
    { label: t('pg.vin.driveType'), value: result?.driveType },
    { label: t('pg.vin.bodyClass'), value: result?.bodyClass },
    { label: t('pg.vin.trim'), value: result?.trim },
    { label: t('pg.carsel.maker'), value: result?.manufacturer },
    { label: t('pg.vin.country'), value: result?.plantCountry },
  ].filter((f) => f.value);

  return (
    <div className="w-full max-w-xl mx-auto space-y-5">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10">
          <Car className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold">{t('pg.vin.title')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('pg.vin.subtitle')}
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          ref={inputRef}
          placeholder={t('pg.vin.examplePlaceholder')}
          value={vin}
          onChange={(e) => { setVin(e.target.value.toUpperCase()); setError(''); setResult(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') decode(); }}
          className="h-11 font-mono text-sm tracking-wider"
          maxLength={17}
        />
        <Button onClick={decode} disabled={loading || vin.length !== 17} className="h-11 gap-2 shrink-0">
          {loading ? <LoaderInline /> : <Search className="h-4 w-4" />}
          {t('pg.vin.check')}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      {result && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            <span className="font-mono tracking-wider">{result.vin}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {mainFields.map((f) => (
              <div key={f.label} className="space-y-0.5">
                <span className="text-xs text-muted-foreground">{f.label}</span>
                <p className="text-sm font-semibold">{f.value}</p>
              </div>
            ))}
          </div>

          {extraFields.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={() => setShowAll(!showAll)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAll ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {showAll ? t('pg.vin.less') : t('pg.vin.more')}
              </button>
              {showAll && (
                <div className="grid grid-cols-2 gap-3 border-t pt-3">
                  {extraFields.map((f) => (
                    <div key={f.label} className="space-y-0.5">
                      <span className="text-xs text-muted-foreground">{f.label}</span>
                      <p className="text-sm font-semibold">{f.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
            <Button variant="default" onClick={searchParts} className="flex-1 gap-2">
              <Search className="h-4 w-4" />
              {t('pg.vin.searchParts')}
            </Button>
          </div>
        </Card>
      )}

      <p className="text-xs text-muted-foreground text-center">
        {t('pg.vin.hint')}
      </p>
    </div>
  );
}
