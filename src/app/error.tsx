'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center" style={{ paddingInline: 'var(--space-container)' }}>
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertTriangle className="h-10 w-10 text-destructive" />
      </div>
      <h2 className="text-2xl font-bold">{'Ինչ-որ բան սխալ է'}</h2>
      <p className="mt-2 text-muted-foreground">{'Կրկին փորձելու համար սեղմեք կոճակը'}</p>
      <Button onClick={reset} size="lg" className="mt-8 gap-2">
        <RotateCcw className="h-4 w-4" /> {'Կրկին փորձել'}
      </Button>
    </div>
  );
}
