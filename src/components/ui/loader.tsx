'use client';

import { PreloaderVideo } from '@/components/PreloaderVideo';

export function Loader({ text }: { text?: string }) {
  return <PreloaderVideo text={text} />;
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
