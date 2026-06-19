'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AiResult {
  description: string;
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
          toast.error('Նախ լրացրեք անվանումը');
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
          toast.success('AI-ն ստեղծեց նկարագրությունը և SEO-ն');
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'Սխալ');
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {loading ? 'Գեներացվում է...' : 'AI գեներացիա'}
    </Button>
  );
}
