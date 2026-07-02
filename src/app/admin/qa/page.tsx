'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Check, X, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { formatDateLocalized } from '@/lib/formatters';
import type { Id } from '../../../../convex/_generated/dataModel';
import { useAdminT } from '@/lib/i18n/admin';

export default function AdminQaPage() {
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const { t } = useAdminT();
  const questions = useQuery(api.questions.listAll, sessionToken ? { sessionToken } : 'skip');
  const answer = useMutation(api.questions.answer);
  const approve = useMutation(api.questions.approve);
  const remove = useMutation(api.questions.remove);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const submitAnswer = async (id: Id<'productQuestions'>) => {
    const text = (drafts[id] ?? '').trim();
    if (!text) { toast.error(t('acat.writeAnswer')); return; }
    await answer({ sessionToken: sessionToken!, id, answer: text });
    toast.success(t('acat.answerPublished'));
    setDrafts((d) => ({ ...d, [id]: '' }));
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">{t('acat.questionsTitle')}</h1>
      <div className="space-y-3">
        {questions?.map((q) => (
          <Card key={q._id}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{q.authorName}</span>
                    <Badge variant={q.answer ? 'default' : 'secondary'} className="text-[10px]">{q.answer ? t('acat.answered') : t('acat.pending')}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDateLocalized(q.createdAt, t)}</span>
                    <span className="text-xs text-muted-foreground">· {q.productName}</span>
                  </div>
                  <p className="mt-1.5 text-sm">{q.question}</p>
                  {q.answer && <p data-testid="qa-answered" className="mt-2 rounded-lg bg-muted/50 p-2 text-sm text-muted-foreground"><span className="font-semibold text-primary">{t('acat.answerLabel')}</span>{q.answer}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  {!q.isApproved && (
                    <Button size="sm" variant="outline" className="h-8 text-xs text-green-600" onClick={async () => { await approve({ sessionToken: sessionToken!, id: q._id, approved: true }); toast.success(t('acat.approved')); }}>
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="h-8 text-xs text-destructive" onClick={async () => { await remove({ sessionToken: sessionToken!, id: q._id }); toast.success(t('acat.removed')); }}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Input data-testid="qa-answer-input" value={drafts[q._id] ?? ''} onChange={(e) => setDrafts((d) => ({ ...d, [q._id]: e.target.value }))} placeholder={t('acat.answerPlaceholder')} className="h-9 text-sm" />
                <Button size="sm" data-testid="qa-answer-submit" className="h-9 gap-1 text-xs whitespace-nowrap" onClick={() => submitAnswer(q._id)}>
                  <Send className="h-3 w-3" /> {q.answer ? t('acat.update') : t('acat.answer')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {questions?.length === 0 && <p className="py-8 text-center text-muted-foreground">{t('acat.noQuestions')}</p>}
      </div>
    </div>
  );
}
