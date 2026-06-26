'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { useT } from '@/lib/i18n/admin';

export default function NotFound() {
  const { t } = useT();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center" style={{ paddingInline: 'var(--space-container)' }}>
      <div className="mb-6">
        <Logo size={80} />
      </div>
      <h1 className="text-6xl font-black text-primary">404</h1>
      <p className="mt-4 text-xl font-semibold">{t('misc.notFoundTitle')}</p>
      <p className="mt-2 text-muted-foreground">{t('misc.notFoundText')}</p>
      <Link href="/" className="mt-8">
        <Button size="lg" className="gap-2">
          <Home className="h-4 w-4" /> {t('misc.homePage')}
        </Button>
      </Link>
    </div>
  );
}
