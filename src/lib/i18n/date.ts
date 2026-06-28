'use client';

import { useT } from '@/lib/i18n/admin';
import { formatDateLocalized } from '@/lib/formatters';

/**
 * Hook returning a `formatDate(timestamp)` function bound to the current UI
 * language. Hydration-safe via {@link useAdminT} (Armenian until mount).
 */
export function useFormatDate(): (timestamp: number) => string {
  const { t } = useT();
  return (timestamp: number) => formatDateLocalized(timestamp, t);
}
