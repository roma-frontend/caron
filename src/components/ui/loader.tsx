'use client';

import { PreloaderVideo } from '@/components/PreloaderVideo';
import { ShoppingCart } from 'lucide-react';

export function Loader({ text }: { text?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 py-20">
      <div className="relative">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <ShoppingCart className="h-7 w-7 text-primary animate-pulse" />
        </div>
        <div className="absolute inset-0 rounded-2xl border-2 border-primary/30 animate-ping" />
      </div>
      {text && <p className="text-sm text-muted-foreground animate-pulse">{text}</p>}
    </div>
  );
}

export function LoaderInline() {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}
