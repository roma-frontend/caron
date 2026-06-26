'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LoaderInline } from '@/components/ui/loader';
import { Card } from '@/components/ui/card';
import { Barcode, Search, Package, ChevronRight } from 'lucide-react';
import { formatPrice } from '@/lib/formatters';
import { useT } from '@/lib/i18n/admin';

export function OemSearchInline() {
  const { t } = useT();
  const router = useRouter();
  const [oem, setOem] = useState('');
  const [debouncedOem, setDebouncedOem] = useState('');
  const [typingTimeout, setTypingTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [searched, setSearched] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleChange = (value: string) => {
    setOem(value);
    if (typingTimeout) clearTimeout(typingTimeout);
    if (value.trim().length >= 3) {
      const t = setTimeout(() => {
        setDebouncedOem(value.trim());
        setSearched(true);
      }, 400);
      setTypingTimeout(t);
    } else {
      setDebouncedOem('');
      setSearched(false);
    }
  };

  const results = useQuery(
    api.products.searchByOem,
    debouncedOem.length >= 3 ? { oem: debouncedOem, limit: 12 } : 'skip'
  );

  const goToAll = () => {
    router.push(`/oem/${encodeURIComponent(oem.trim())}`);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10">
          <Barcode className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold">{t('sp.oemSearch')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('sp.oemSearchDesc')}
        </p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('sp.oemPlaceholder')}
            value={oem}
            onChange={(e) => { handleChange(e.target.value); setShowResults(true); }}
            onFocus={() => { if (results && results.length > 0) setShowResults(true); }}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            className="h-11 pl-9 font-mono text-sm"
          />
        </div>
        <Button onClick={goToAll} disabled={oem.trim().length < 3} className="h-11 gap-2 shrink-0">
          <Search className="h-4 w-4" />
          {t('sp.searchBtn')}
        </Button>
      </div>

      {searched && debouncedOem.length >= 3 && results === undefined && (
        <div className="flex justify-center py-4"><LoaderInline /></div>
      )}

      {searched && results && results.length > 0 && showResults && (
        <Card className="p-1 overflow-hidden">
          {results.slice(0, 6).map((p) => (
            <button
              key={p._id}
              onClick={() => router.push(`/products/${p.slug}`)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent transition-colors rounded-lg"
            >
              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="flex-1 text-sm truncate">{p.name}</span>
              <span className="text-sm font-semibold text-primary shrink-0">{formatPrice(p.price)}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))}
          {results.length > 6 && (
            <button
              onClick={goToAll}
              className="w-full px-4 py-2.5 text-center text-sm text-primary hover:bg-accent transition-colors rounded-lg font-medium"
            >
              {t('sp.see')} {results.length} {t('sp.resultsWord')}
            </button>
          )}
        </Card>
      )}

      {searched && results && results.length === 0 && debouncedOem.length >= 3 && (
        <p className="text-sm text-muted-foreground text-center py-3">
          {t('sp.noOemResults')}
        </p>
      )}
    </div>
  );
}
