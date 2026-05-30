'use client';

import { Toaster } from 'sonner';
import { useTheme } from 'next-themes';

export function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return <Toaster richColors position="top-center" theme={(resolvedTheme as 'light' | 'dark') || 'dark'} />;
}
