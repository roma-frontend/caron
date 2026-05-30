'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export function CookieConsent({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consented = localStorage.getItem('cookie-consent');
    if (!consented) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem('cookie-consent', 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] border-t bg-background/95 backdrop-blur-md p-4 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 sm:flex-row">
        <p className="flex-1 text-sm text-muted-foreground">{text}</p>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" onClick={accept} className="rounded-xl">Համաձայն եմ</Button>
          <Button size="sm" variant="ghost" onClick={() => setVisible(false)} className="rounded-xl">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
