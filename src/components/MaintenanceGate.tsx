'use client';

import { useSettings } from '@/hooks/useSettings';
import { Wrench } from 'lucide-react';
import { useT } from '@/lib/i18n/admin';

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { t } = useT();
  const settings = useSettings();
  if (settings?.maintenanceMode) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Wrench className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold sm:text-3xl">{settings.maintenanceMessage || t('sx.maintenance.title')}</h1>
        <p className="text-muted-foreground">{t('sx.maintenance.message')}</p>
      </div>
    );
  }
  return <>{children}</>;
}
