'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/admin';

export function ThemeToggle() {
  const { t } = useT();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t('sx.themeToggle')}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      suppressHydrationWarning
    >
      {mounted && (isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />)}
    </Button>
  );
}
