'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Send, X, Loader2, Phone, MessageCircle, MessageSquare, Smartphone } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/store/auth';
import { getRoleSuggestions, type UserRole } from '@/lib/aiAssistant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SITE } from '@/lib/constants';
import Link from '@/components/LocalizedLink';
import { usePathname } from 'next/navigation';
import { useT } from '@/lib/i18n/admin';

type Message = { id: string; role: 'user' | 'assistant'; content: string };

// Render assistant message with clickable internal links (e.g. /products, /cart)
function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(\/[a-z][a-z0-9\-/]*)/g);
  return (
    <p className="whitespace-pre-wrap">
      {parts.map((part, i) =>
        /^\/[a-z][a-z0-9\-/]*$/.test(part) ? (
          <Link key={i} href={part} className="font-medium underline underline-offset-2 text-primary hover:opacity-80">
            {part}
          </Link>
        ) : (
          part
        )
      )}
    </p>
  );
}

export function FloatingActions() {
  const { t } = useT();
  const pathname = usePathname();
  const settings = useSettings();
  const { user } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [, setShowTop] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const role: UserRole = user?.role === 'admin' ? 'admin' : user ? 'customer' : 'guest';
  const suggestions = getRoleSuggestions(role);
  const noMobileNav = pathname === '/' || /^\/products\/.+/.test(pathname);
  const mobileBottom = noMobileNav ? '1.5rem' : '5rem';

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Allow other UI (e.g. the mobile menu's AI banner) to open the assistant.
  useEffect(() => {
    const openChat = () => setChatOpen(true);
    window.addEventListener('caron:open-ai-chat', openChat);
    return () => window.removeEventListener('caron:open-ai-chat', openChat);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          user: { name: user?.name || 'Guest', email: user?.email || '', role },
          history: messages.slice(-10),
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: data.reply || data.error || 'Error' }]);
    } catch {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: t('cmp.service_unavailable') }]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, role, user]);

  return (
    <>
      {/* Chat panel */}
      {chatOpen && (
        <div className="fixed bottom-20 right-4 z-50 flex w-[340px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border bg-background shadow-2xl lg:right-6 lg:w-[380px] lg:bottom-20 animate-in slide-in-from-bottom-4 duration-200" style={{ height: 'min(480px, 65vh)', maxHeight: 'calc(65vh - 4rem)', marginBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' }}>
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10"><Bot className="h-4 w-4 text-primary" /></div>
            <div className="flex-1"><p className="text-sm font-semibold">{SITE.name} AI</p><p className="text-[10px] text-muted-foreground">{t('cmp.assistant_label')}</p></div>
            <div className="flex gap-1">
              {settings?.whatsapp && (
                <Link href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="rounded-lg p-1.5 hover:bg-muted" aria-label="WhatsApp">
                  <MessageSquare className="h-4 w-4 text-green-500" />
                </Link>
              )}
              {settings?.telegram && (
                <Link href={`https://t.me/${settings.telegram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="rounded-lg p-1.5 hover:bg-muted" aria-label="Telegram">
                  <Smartphone className="h-4 w-4 text-sky-500" />
                </Link>
              )}
              <Link href={`tel:${settings?.phone || ''}`} className="rounded-lg p-1.5 hover:bg-muted"><Phone className="h-4 w-4" /></Link>
              <button onClick={() => setChatOpen(false)} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3 pt-4">
                <p className="text-center text-xs text-muted-foreground">{t('cmp.how_can_help')}</p>
                <div className="grid gap-2">
                  {suggestions.map((s) => (
                    <button key={s} onClick={() => sendMessage(s)} className="rounded-xl border px-3 py-2 text-left text-xs transition-colors hover:border-primary/40 hover:bg-primary/5">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10"><Bot className="h-3 w-3 text-primary" /></div>}
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {msg.role === 'assistant' ? <MessageContent content={msg.content} /> : <p className="whitespace-pre-wrap">{msg.content}</p>}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10"><Bot className="h-3 w-3 text-primary" /></div>
                <div className="rounded-xl bg-muted px-3 py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
              </div>
            )}
          </div>
          <div className="border-t p-3">
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2">
              <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('cmp.write_message')} className="h-9 text-sm rounded-xl" disabled={loading} />
              <Button type="submit" size="icon" className="h-9 w-9 shrink-0 rounded-xl" disabled={!input.trim() || loading}><Send className="h-4 w-4" /></Button>
            </form>
          </div>
        </div>
      )}

      {/* Floating buttons. The AI button is desktop-only — on mobile the
          assistant lives in the bottom-menu banner, so it's hidden there to
          avoid duplication / clutter over the bottom navigation. */}
      <div data-fab className="fixed right-4 z-50 flex flex-col items-end gap-3" style={{ bottom: mobileBottom, transition: 'bottom 0.35s cubic-bezier(0.22, 1, 0.36, 1)', marginBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.25rem)' }}>
        <style>{'@media (min-width:768px){[data-fab]{bottom:1.5rem!important;right:1.5rem!important;transition:none!important}}'}</style>
        {!chatOpen && settings?.whatsapp && (
          <Link href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-white shadow-xl transition-all hover:scale-110 hover:bg-green-600"
            aria-label="WhatsApp">
            <MessageSquare className="h-5 w-5" />
          </Link>
        )}
        {!chatOpen && settings?.telegram && (
          <Link href={`https://t.me/${settings.telegram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-white shadow-xl transition-all hover:scale-110 hover:bg-sky-600"
            aria-label="Telegram">
            <Smartphone className="h-5 w-5" />
          </Link>
        )}
        <button onClick={() => setChatOpen(!chatOpen)} className={`hidden h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-300 lg:flex ${chatOpen ? 'bg-foreground/80 text-background rotate-90' : 'bg-primary text-white hover:scale-110'}`} aria-label="AI Assistant">
          {chatOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        </button>
      </div>
    </>
  );
}
