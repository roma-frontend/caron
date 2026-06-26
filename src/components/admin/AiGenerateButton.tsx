'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n/admin';

interface AiResult {
  description: string;
  descriptionRu: string;
  descriptionEn: string;
  seoTitle: string;
  seoDescription: string;
}

interface Props {
  getInput: () => { name: string; category?: string; brand?: string; attributes?: Record<string, unknown> };
  onResult: (r: AiResult) => void;
  className?: string;
}

/**
 * Calls /api/ai-generate with the product's basic fields and fills in the
 * description + SEO fields from the AI result.
 */
export function AiGenerateButton({ getInput, onResult, className }: Props) {
  const { t } = useT();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={loading}
      className={`gap-2 ${className ?? ''}`}
      onClick={async () => {
        const input = getInput();
        if (!input.name?.trim()) {
          toast.error(t('acmp.ai.fillName'));
          return;
        }
        setLoading(true);
        try {
          const res = await fetch('/api/ai-generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Error');
          onResult(data as AiResult);
          toast.success(t('acmp.ai.success'));
        } catch (e) {
          toast.error(e instanceof Error ? e.message : t('acmp.ai.error'));
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {loading ? t('acmp.ai.generating') : t('acmp.ai.generate')}
    </Button>
  );
}
