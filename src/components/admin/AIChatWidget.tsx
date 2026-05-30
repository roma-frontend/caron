'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/store/auth';
import { getRoleSuggestions, type UserRole } from '@/lib/aiAssistant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, X, Bot, User, Loader2 } from 'lucide-react';

type Message = { id: string; role: 'user' | 'assistant'; content: string };

export function AIChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const role: UserRole = user?.role === 'admin' ? 'admin' : user ? 'customer' : 'guest';
  const suggestions = getRoleSuggestions(role);

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
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: data.reply || data.error || 'Error' };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Ծառայությունը անհասանելի է։ Փորձեք ավելի ուշ։' }]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, role, user]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="fixed bottom-24 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-110 lg:bottom-6">
        <Bot className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-4 z-50 flex w-[340px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border bg-background shadow-2xl lg:bottom-6 lg:w-[380px]" style={{ height: 'min(500px, 70vh)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10"><Bot className="h-4 w-4 text-primary" /></div>
        <div className="flex-1"><p className="text-sm font-semibold">Caroon AI</p><p className="text-[10px] text-muted-foreground">Ավտոպահեստամասերի օգնական</p></div>
        <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-3 pt-4">
            <p className="text-center text-xs text-muted-foreground">Հարցրեք ինձ</p>
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

      {/* Input */}
      <div className="border-t p-3">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Գրեք հաղորդագրություն..." className="h-9 text-sm rounded-xl" disabled={loading} />
          <Button type="submit" size="icon" className="h-9 w-9 shrink-0 rounded-xl" disabled={!input.trim() || loading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
