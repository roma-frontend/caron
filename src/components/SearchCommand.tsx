'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator } from '@/components/ui/command';
import { formatPrice } from '@/lib/formatters';
import { Package, Clock, TrendingUp } from 'lucide-react';

const HISTORY_KEY = 'search-history';
const MAX_HISTORY = 5;
const POPULAR = ['Շարժիչի յուղ', 'Արգելակման բարձիկներ', 'Յուղի ֆիլտր', 'Ակտիվատոր', 'Կայծային մոմեր'];

function getHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch { return []; }
}

function addToHistory(term: string) {
  const prev = getHistory().filter((h) => h !== term);
  const next = [term, ...prev].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export function SearchCommand({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [history, setHistory] = useState(getHistory);
  const term = q.trim();
  const results = useQuery(api.products.list, term.length >= 2 ? { search: term, limit: 8 } : 'skip');

  const refreshHistory = () => setHistory(getHistory());

  const go = (slug: string, searchTerm?: string) => {
    if (searchTerm) addToHistory(searchTerm);
    onOpenChange(false);
    setQ('');
    router.push(`/products/${slug}`);
  };

  const searchAll = (searchTerm: string) => {
    addToHistory(searchTerm);
    onOpenChange(false);
    setQ('');
    router.push(`/products?q=${encodeURIComponent(searchTerm)}`);
  };

  const handleOpenChange = (v: boolean) => {
    if (v) refreshHistory();
    onOpenChange(v);
  };

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange} title="Որոնել">
      <Command shouldFilter={false}>
        <CommandInput value={q} onValueChange={setQ} placeholder="Որոնել ապրանքներ..." />
        <CommandList>
          {term.length < 2 ? (
            <>
              {history.length > 0 && (
                <CommandGroup heading="Վերջին որոնումներ">
                  {history.map((h) => (
                    <CommandItem key={h} value={h} onSelect={() => searchAll(h)} className="gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{h}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandSeparator />
              <CommandGroup heading="Հայտնի ապրանքներ">
                {POPULAR.map((p) => (
                  <CommandItem key={p} value={p} onSelect={() => searchAll(p)} className="gap-3">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span>{p}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : results === undefined ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Որոնում...</div>
          ) : results.length === 0 ? (
            <CommandEmpty>Ոչ մի ապրանք չի գտնվել</CommandEmpty>
          ) : (
            <CommandGroup heading="Ապրանքներ">
              {results.map((p) => (
                <CommandItem key={p._id} value={p._id} onSelect={() => go(p.slug, term)} className="gap-3">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="shrink-0 text-sm font-semibold text-primary">{formatPrice(p.price)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
