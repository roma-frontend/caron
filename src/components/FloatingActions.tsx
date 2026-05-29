'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, ArrowUp, X, Phone } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

export function FloatingActions() {
  const settings = useSettings();
  const [showTop, setShowTop] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Back to top */}
      {showTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground/10 backdrop-blur-sm border shadow-lg hover:bg-foreground/20 transition-all"
          aria-label="Back to top">
          <ArrowUp className="h-5 w-5" />
        </button>
      )}

      {/* Chat options popup */}
      {chatOpen && (
        <div className="mb-2 flex flex-col gap-2 animate-in slide-in-from-bottom-2 duration-200">
          <a href={`https://wa.me/${settings?.whatsapp || "37400000000"}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-full bg-[#25D366] px-5 py-3 text-white shadow-lg hover:opacity-90 transition-opacity">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.625-1.476A11.929 11.929 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.115 0-4.142-.57-5.913-1.652l-.424-.252-2.744.877.87-2.675-.276-.44A9.72 9.72 0 012.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75z"/></svg>
            WhatsApp
          </a>
          <a href={`https://t.me/${settings?.telegram || "autoparts_am"}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-full bg-[#0088cc] px-5 py-3 text-white shadow-lg hover:opacity-90 transition-opacity">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            Telegram
          </a>
          <a href={`tel:${settings?.phone || "+37400000000"}`}
            className="flex items-center gap-3 rounded-full bg-primary px-5 py-3 text-white shadow-lg hover:opacity-90 transition-opacity">
            <Phone className="h-5 w-5" />
            {'Զանգահարել մեզ'}
          </a>
        </div>
      )}

      {/* Main chat button */}
      <button onClick={() => setChatOpen(!chatOpen)}
        className={`flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-300 ${chatOpen ? 'bg-foreground/80 text-background rotate-90' : 'bg-primary text-white hover:scale-110'}`}
        aria-label="Contact">
        {chatOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
