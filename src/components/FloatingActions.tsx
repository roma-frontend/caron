'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, ArrowUp, Send, X, Loader2, Phone, MessageCircle } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/store/auth';
import { getRoleSuggestions, type UserRole } from '@/lib/aiAssistant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SITE } from '@/lib/constants';

type Message = { id: string; role: 'user' | 'assistant'; content: string };

export function FloatingActions() {
  const settings = useSettings();
  const { user } = useAuth();
  const [showTop, setShowTop] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const role: UserRole = user?.role === 'admin' ? 'admin' : user ? 'customer' : 'guest';
  const suggestions = getRoleSuggestions(role);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Ծառայությունը անհասանելի է' }]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, role, user]);

  return (
    <>
      {/* Chat panel */}
      {chatOpen && (
        <div className="fixed bottom-20 right-4 z-50 flex w-[340px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border bg-background shadow-2xl lg:bottom-20 lg:right-6 lg:w-[380px] animate-in slide-in-from-bottom-4 duration-200" style={{ height: 'min(480px, 65vh)' }}>
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10"><Bot className="h-4 w-4 text-primary" /></div>
            <div className="flex-1"><p className="text-sm font-semibold">{SITE.name} AI</p><p className="text-[10px] text-muted-foreground">Օգնական</p></div>
            <div className="flex gap-1">
              <a href={`tel:${settings?.phone || ''}`} className="rounded-lg p-1.5 hover:bg-muted"><Phone className="h-4 w-4" /></a>
              <button onClick={() => setChatOpen(false)} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3 pt-4">
                <p className="text-center text-xs text-muted-foreground">Ինչպես կարող եմ օգնել</p>
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
                  <p className="whitespace-pre-wrap">{msg.content}</p>
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
              <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Գրեք հաղորդագրություն..." className="h-9 text-sm rounded-xl" disabled={loading} />
              <Button type="submit" size="icon" className="h-9 w-9 shrink-0 rounded-xl" disabled={!input.trim() || loading}><Send className="h-4 w-4" /></Button>
            </form>
          </div>
        </div>
      )}

      {/* Floating buttons */}
      <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3 lg:bottom-6 lg:right-6">
        {/* {showTop && (
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground/10 backdrop-blur-sm border shadow-lg hover:bg-foreground/20 transition-all" aria-label="Back to top">
            <ArrowUp className="h-5 w-5" />
          </button>
        )} */}
        <button onClick={() => setChatOpen(!chatOpen)} className={`flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-300 ${chatOpen ? 'bg-foreground/80 text-background rotate-90' : 'bg-primary text-white hover:scale-110'}`} aria-label="AI Assistant">
          {chatOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        </button>
      </div>
    </>
  );
}
