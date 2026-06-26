/** Format price in AMD */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('hy-AM', {
    style: 'currency',
    currency: 'AMD',
    maximumFractionDigits: 0,
  }).format(price);
}

/** Calculate discount percentage */
export function discountPercent(price: number, compareAt: number): number {
  return Math.round((1 - price / compareAt) * 100);
}


const MONTHS_HY = ['Հունվար', 'Փետրվար', 'Մարտ', 'Ապրիլ', 'Մայիս', 'Հունիս', 'Հուլիս', 'Օգոստոս', 'Սեպտեմբեր', 'Հոկտեմբեր', 'Նոյեմբեր', 'Դեկտեմբեր'] as const;

/** Format date in Armenian */
export function formatDateHy(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getDate()} ${MONTHS_HY[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Format a date using the localized month name. Pass the `t` function from
 * `useT()`/`useAdminT()` so the month is rendered in the current UI language
 * (`cmp.month_1..12`). Falls back to Armenian when `t` resolves to Armenian.
 */
export function formatDateLocalized(timestamp: number, t: (key: string) => string): string {
  const d = new Date(timestamp);
  return `${d.getDate()} ${t(`cmp.month_${d.getMonth() + 1}`)} ${d.getFullYear()}`;
}

/**
 * Localize a free-text delivery estimate (admin setting, written in Armenian)
 * by translating the Armenian day words. Numbers/ranges are left intact.
 * Falls back to the original text for Armenian or when nothing matches.
 */
export function localizeDeliveryEstimate(text: string | undefined | null, lang: 'hy' | 'ru' | 'en'): string {
  if (!text) return '';
  if (lang === 'hy') return text;
  const words = lang === 'ru'
    ? { work: 'рабочих дней', days: 'дней', day: 'дн.' }
    : { work: 'business days', days: 'days', day: 'days' };
  return text
    .replace(/աշխատանքային\s+օ(ր|րեր)/g, words.work)
    .replace(/օրեր/g, words.days)
    .replace(/օր/g, words.day);
}
