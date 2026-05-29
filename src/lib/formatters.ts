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
