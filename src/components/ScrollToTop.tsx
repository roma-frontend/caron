'use client';

import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

export function ScrollToTop() {
  const settings = useSettings();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!settings?.enableScrollToTop) return;
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [settings?.enableScrollToTop]);

  if (!visible || settings?.enableScrollToTop === false) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-10 left-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all hover:bg-primary/90 hover:-translate-y-1 lg:bottom-6"
      aria-label="Ոլորել վերև"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
