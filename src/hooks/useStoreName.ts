'use client';

import { useSettings } from '@/hooks/useSettings';
import { SITE } from '@/lib/constants';

/** Returns the store name from settings, falls back to SITE.name constant */
export function useStoreName() {
  const settings = useSettings();
  return settings?.storeName || SITE.name;
}
