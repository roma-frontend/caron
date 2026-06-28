'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { useT, ADMIN_LANGS, adminLangLabel, adminLangName } from '@/lib/i18n/admin';
import { localizedPath, type Locale } from '@/lib/i18n/locale';
import { cn } from '@/lib/utils';

/**
 * HY / RU / EN language dropdown for the storefront. Switching uses client-side
 * navigation to the locale-prefixed URL (hy = no prefix) — no full page reload;
 * the LocaleProvider re-derives the locale from the new path.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang } = useT();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const switchTo = (l: Locale) => {
    setOpen(false);
    const target = localizedPath(pathname || '/', l);
    if (target !== pathname) router.push(target);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language"
        className="flex h-9 items-center gap-1.5 rounded-full border bg-background px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Globe className="h-4 w-4" />
        <span className="text-xs font-semibold">{adminLangLabel(lang)}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-xl border bg-popover p-1 shadow-xl"
          style={{ animation: 'fadeIn 0.12s ease' }}
        >
          {ADMIN_LANGS.map((l) => (
            <button
              key={l}
              role="option"
              aria-selected={lang === l}
              onClick={() => switchTo(l)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-accent',
                lang === l ? 'font-semibold text-foreground' : 'text-muted-foreground',
              )}
            >
              <span className="flex h-5 w-7 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-bold">
                {adminLangLabel(l)}
              </span>
              <span className="flex-1 text-left">{adminLangName(l)}</span>
              {lang === l && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
