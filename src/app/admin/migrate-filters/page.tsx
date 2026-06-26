'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminT } from '@/lib/i18n/admin';

export default function MigrateFiltersPage() {
  const { t } = useAdminT();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ error?: string; message?: string; updated?: number } | null>(null);

  const handleMigrate = async () => {
    if (!confirm(t('acat.migrateConfirm'))) {
      return;
    }

    setRunning(true);
    try {
      const res = await fetch('/api/admin/migrate-filters');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Migration failed');
      }

      setResult(data);
      toast.success(`${data.message} ✅`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`${t('acat.migrateFailed')} ${msg}`);
      setResult({ error: msg });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <Card className="border-warning/50 bg-gradient-to-br from-card to-warning/5">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Zap className="h-6 w-6 text-warning" />
              {t('acat.migrateTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h3 className="font-semibold">{t('acat.whatHappens')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('acat.migrateDesc')}
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 mt-2">
                <li>✓ {t('acat.migrateLi1')}</li>
                <li>✓ {t('acat.migrateLi2')}</li>
                <li>✓ {t('acat.migrateLi3')}</li>
              </ul>
            </div>

            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-destructive">{t('acat.important')}</p>
                  <p className="text-destructive/80">{t('acat.migrateWarning')}</p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleMigrate} 
              disabled={running} 
              size="lg"
              className="w-full gap-2"
            >
              <Zap className="h-5 w-5" />
              {running ? t('acat.migrating') : t('acat.runMigration')}
            </Button>

            {result && (
              <div className={`p-4 rounded-lg ${result.error ? 'bg-destructive/10 border border-destructive/20' : 'bg-green-500/10 border border-green-500/20'}`}>
                {result.error ? (
                  <div className="text-sm text-destructive">
                    <p className="font-semibold">{t('acat.error')}</p>
                    <p>{result.error}</p>
                  </div>
                ) : (
                  <div className="text-sm text-green-700 dark:text-green-400">
                    <p className="font-semibold">✅ {t('acat.success')}</p>
                    <p>{result.message}</p>
                    <p className="text-xs mt-1 opacity-75">{t('acat.updatedColon')} {result.updated} {t('acat.productWord')}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
