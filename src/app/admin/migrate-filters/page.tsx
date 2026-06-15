'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function MigrateFiltersPage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ error?: string; message?: string; updated?: number } | null>(null);

  const handleMigrate = async () => {
    if (!confirm('Սա կգծանցի բոլոր ապրանքների ֆիլտր հատկանիշները նոր համակարգին:\n\nԱյս գործողությունը կարևոր է և կատարվում է միայն մեկ անգամ!')) {
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
      toast.error(`Գծանցում ձախողվեց։ ${msg}`);
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
              Ֆիլտրի համակարգ միգրացիա
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h3 className="font-semibold">Ինչ է տեղի ունենում?</h3>
              <p className="text-sm text-muted-foreground">
                Այս գործողությունը թարմացնում է բոլոր ապրանքների ֆիլտր հատկանիշները:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 mt-2">
                <li>✓ Բոլոր ֆիլտր կանշում կվերանվանվի UUID-ից</li>
                <li>✓ Կապը չի խախտվի անունը փոխելիս</li>
                <li>✓ Բոլոր ապրանքներ ստանում են նոր հատկանիշ բանալիներ</li>
              </ul>
            </div>

            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-destructive">Կարևոր</p>
                  <p className="text-destructive/80">Միգրացիան չի շրջելի: Համոզվեք, որ սա ճիշտ ժամանակն է:</p>
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
              {running ? 'Գծանցվում է...' : 'Գործարկել միգրացիա'}
            </Button>

            {result && (
              <div className={`p-4 rounded-lg ${result.error ? 'bg-destructive/10 border border-destructive/20' : 'bg-green-500/10 border border-green-500/20'}`}>
                {result.error ? (
                  <div className="text-sm text-destructive">
                    <p className="font-semibold">Սխալ</p>
                    <p>{result.error}</p>
                  </div>
                ) : (
                  <div className="text-sm text-green-700 dark:text-green-400">
                    <p className="font-semibold">✅ Հաջողված</p>
                    <p>{result.message}</p>
                    <p className="text-xs mt-1 opacity-75">Թարմացվել է: {result.updated} ապրանք</p>
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
