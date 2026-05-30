'use client';

import { useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';

const CSS_KEYS = [
  '--primary',
  '--primary-foreground',
  '--ring',
  '--sidebar-primary',
  '--sidebar-primary-foreground',
  '--accent',
  '--accent-foreground',
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
] as const;

const DARK_OVERRIDES: Record<string, string> = {
  '--primary-foreground': 'oklch(0.99 0 0)',
  '--sidebar-primary-foreground': 'oklch(0.99 0 0)',
};

export function BrandTheme() {
  const settings = useSettings();
  const accent = settings?.accentColor;

  useEffect(() => {
    const root = document.documentElement;
    if (accent) {
      CSS_KEYS.forEach((k) => {
        if (k === '--primary-foreground' || k === '--sidebar-primary-foreground') {
          root.style.setProperty(k, DARK_OVERRIDES[k]);
        } else {
          root.style.setProperty(k, accent);
        }
      });
    } else {
      CSS_KEYS.forEach((k) => root.style.removeProperty(k));
    }
  }, [accent]);

  return null;
}
