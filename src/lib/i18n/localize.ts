'use client';

import { useAdminT } from '@/lib/i18n/admin';
import type { AdminLang } from '@/store/adminLang';

const SUFFIX: Record<AdminLang, string> = { hy: '', ru: 'Ru', en: 'En' };

/**
 * Pick a localized DB field with Armenian fallback. Given a base field name
 * (e.g. `name`), returns `obj.nameRu` / `obj.nameEn` for RU/EN when present,
 * otherwise falls back to the base Armenian `obj.name`.
 */
export function pickLocalized(
  obj: Record<string, unknown> | null | undefined,
  base: string,
  lang: AdminLang,
): string {
  if (!obj) return '';
  const localized = obj[`${base}${SUFFIX[lang]}`];
  if (typeof localized === 'string' && localized.trim()) return localized;
  const fallback = obj[base];
  return typeof fallback === 'string' ? fallback : '';
}

/**
 * Hook returning a `loc(obj, base)` function bound to the current UI language.
 * Hydration-safe: relies on {@link useAdminT} which yields Armenian until mount.
 */
export function useLocalize(): { lang: AdminLang; loc: (obj: Record<string, unknown> | null | undefined, base: string) => string } {
  const { lang } = useAdminT();
  return { lang, loc: (obj, base) => pickLocalized(obj, base, lang) };
}
