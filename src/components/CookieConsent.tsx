'use client';

import { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';
import Link from 'next/link';

export function CookieConsent({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const consented = localStorage.getItem('cookie-consent');
    if (!consented) {
      setTimeout(() => setVisible(true), 600);
    }
  }, []);

  const accept = () => {
    setLeaving(true);
    setTimeout(() => {
      localStorage.setItem('cookie-consent', 'true');
      setVisible(false);
    }, 300);
  };

  const dismiss = () => {
    setLeaving(true);
    setTimeout(() => setVisible(false), 300);
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 z-[9999] transition-all duration-300 sm:left-auto sm:right-4 sm:max-w-sm ${
        leaving ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
      }`}
    >
      <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Cookie className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {text}{' '}
              <Link href="/privacy" className="font-medium text-primary underline-offset-2 hover:underline" onClick={dismiss}>
                Մանրամասներ
              </Link>
            </p>
          </div>
          <button onClick={dismiss} aria-label="Փակել" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={accept} className="flex-1 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-primary/90 active:scale-[0.98]">
            Ընդունել
          </button>
          <button onClick={dismiss} className="flex-1 rounded-xl border border-border/50 px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]">
            Մերժել
          </button>
        </div>
      </div>
    </div>
  );
}
