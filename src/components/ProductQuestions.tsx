'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircleQuestion, Send, CornerDownRight } from 'lucide-react';
import { toast } from 'sonner';
import { Id } from '../../convex/_generated/dataModel';
import { formatDateHy } from '@/lib/formatters';
import { useAuthStore } from '@/store/auth';

export function ProductQuestions({ productId }: { productId: Id<'products'> }) {
  const questions = useQuery(api.questions.listByProduct, { productId });
  const ask = useMutation(api.questions.ask);
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const user = useAuthStore((s) => s.user);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Լրացրեք ձեր անունը'); return; }
    if (question.trim().length < 3) { toast.error('Գրեք ձեր հարցը'); return; }
    setSending(true);
    try {
      await ask({ productId, authorName: name, question, sessionToken: sessionToken || undefined });
      toast.success('Հարցն ուղարկվեց և սպասում է պատասխանի');
      setShowForm(false); setQuestion('');
    } catch { toast.error('Չհաջողվեց ուղարկել հարցը'); } finally { setSending(false); }
  };

  return (
    <div className="mt-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <MessageCircleQuestion className="h-5 w-5 text-primary" />
          Հարցեր ապրանքի մասին
          {questions && questions.length > 0 && <span className="text-sm font-normal text-muted-foreground">({questions.length})</span>}
        </h2>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Փակել' : 'Տալ հարց'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-5 space-y-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Անուն" className="h-10" />
            <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Օր.՝ Կտեղավորվի՞ իմ մեքենայի վրա..." rows={3} />
            <Button onClick={handleSubmit} disabled={sending} className="gap-2">
              <Send className="h-4 w-4" /> {sending ? 'Ուղարկվում է...' : 'Ուղարկել հարցը'}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {questions?.map((q) => (
          <Card key={q._id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{q.authorName}</span>
                <span className="text-xs text-muted-foreground">{formatDateHy(q.createdAt)}</span>
              </div>
              <p className="mt-1.5 text-sm">{q.question}</p>
              {q.answer && (
                <div className="mt-3 flex gap-2 rounded-lg bg-muted/50 p-3">
                  <CornerDownRight className="h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs font-semibold text-primary">Խանութի պատասխան</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{q.answer}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {questions?.length === 0 && !showForm && (
          <p className="py-6 text-center text-sm text-muted-foreground">Դեռ հարցեր չկան։ Տվեք առաջին հարցը։</p>
        )}
      </div>
    </div>
  );
}
