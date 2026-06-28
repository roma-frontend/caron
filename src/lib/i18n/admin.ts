'use client';

import { useEffect, useState } from 'react';
import { useAdminLangStore, type AdminLang } from '@/store/adminLang';
import { useLocale } from './LocaleProvider';
import { DICT } from './dict';

/**
 * Project-wide i18n (HY / RU / EN). The dictionary is split into domain modules
 * under `dict/` and merged in `dict/index.ts`. Lookup falls back to Armenian,
 * then to the raw key, so a missing translation degrades gracefully.
 *
 * `useAdminT` / `useT` are the same hook — `useT` is the preferred name for
 * non-admin (storefront) usage.
 */

const LANG_LABELS: Record<AdminLang, string> = { hy: 'ՀՅ', ru: 'РУ', en: 'EN' };
const LANG_NAMES: Record<AdminLang, string> = { hy: 'Հայերեն', ru: 'Русский', en: 'English' };
export const ADMIN_LANGS: AdminLang[] = ['hy', 'ru', 'en'];
export function adminLangLabel(lang: AdminLang): string {
  return LANG_LABELS[lang];
}
export function adminLangName(lang: AdminLang): string {
  return LANG_NAMES[lang];
}

export type AdminTFn = (key: string) => string;

/** Translate a single key for the given language (HY fallback, then key). */
export function translateAdmin(lang: AdminLang, key: string): string {
  const entry = DICT[key];
  if (!entry) return key;
  return entry[lang] ?? entry.hy ?? key;
}

/** Hook returning the current language, a setter and a `t(key)` function.
 *
 * To stay hydration-safe on server-rendered/static storefront pages, the very
 * first client render uses Armenian (matching the server HTML); after mount it
 * switches to the persisted language. This avoids text-content mismatches at
 * the cost of a brief flash for RU/EN visitors on first paint. */
export function useAdminT(): { lang: AdminLang; setLang: (l: AdminLang) => void; t: AdminTFn } {
  const stored = useAdminLangStore((s) => s.lang);
  const setLang = useAdminLangStore((s) => s.setLang);
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  const lang: AdminLang = mounted ? stored : 'hy';
  return { lang, setLang, t: (key: string) => translateAdmin(lang, key) };
}

/**
 * Storefront i18n. Unlike the admin panel, the storefront language comes from
 * the URL locale (provided by {@link LocaleProvider} from the `x-locale`
 * middleware header), so server and client render the SAME language with no
 * hydration flash. Falls back to the admin store only if used outside a
 * provider (should not happen on the storefront).
 */
export function useT(): { lang: AdminLang; setLang: (l: AdminLang) => void; t: AdminTFn } {
  const urlLocale = useLocale();
  const stored = useAdminLangStore((s) => s.lang);
  const setLang = useAdminLangStore((s) => s.setLang);
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  const lang: AdminLang = urlLocale ?? (mounted ? stored : 'hy');
  return { lang, setLang, t: (key: string) => translateAdmin(lang, key) };
}
