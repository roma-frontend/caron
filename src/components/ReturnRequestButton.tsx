'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation } from 'convex/react';
import { RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useAuthStore } from '@/store/auth';
import { useT } from '@/lib/i18n/admin';

interface OrderItem { productId: Id<'products'>; name: string; quantity: number }

const REASONS = ['Թերություն/վնասված', 'Չի համապատասխանում', 'Սխալ ապրանք', 'Չի տեղավորվում', 'Այլ'];

/**
 * Customer-facing return / exchange request. Opens a modal where the buyer
 * picks items, type (return or exchange) and a reason.
 */
export function ReturnRequestButton({ orderId, items, existingStatus }: {
  orderId: Id<'orders'>;
  items: OrderItem[];
  existingStatus?: string;
}) {
  const { t } = useT();
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const createRequest = useMutation(api.returns.create);  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'return' | 'exchange'>('return');
  const [selected, setSelected] = useState<Set<string>>(new Set(items.map((i) => i.productId)));
  const [reason, setReason] = useState(REASONS[0]);
  const [comment, setComment] = useState('');
  const [telegram, setTelegram] = useState('');
  const [busy, setBusy] = useState(false);

  if (existingStatus) {
    const labels: Record<string, string> = { pending: t('sp.statusPending'), approved: t('sp.statusApproved'), rejected: t('sp.statusRejected'), completed: t('sp.statusCompleted') };
    return <span data-testid="return-status" className="text-xs text-muted-foreground">{labels[existingStatus] ?? existingStatus}</span>;
  }

  const toggle = (id: string) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const submit = async () => {
    const chosen = items.filter((i) => selected.has(i.productId));
    if (chosen.length === 0) { toast.error(t('sp.selectAtLeastOne')); return; }
    setBusy(true);
    try {
      await createRequest({
        sessionToken: sessionToken || undefined,
        orderId,
        type,
        items: chosen.map((i) => ({ productId: i.productId, name: i.name, quantity: i.quantity })),
        reason,
        comment: comment || undefined,
        customerTelegram: telegram.trim() || undefined,
      });
      toast.success(t('sp.requestSubmitted'));
      setOpen(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : t('sp.error')); } finally { setBusy(false); }
  };

  return (
    <>
      <Button variant="outline" size="sm" data-testid="return-open" className="gap-1.5" onClick={() => setOpen(true)}>
        <RotateCcw className="h-3.5 w-3.5" /> {t('sp.return')}
      </Button>

      {open && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 1000 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border bg-background p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">{t('sp.returnExchange')}</h3>
              <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-accent"><X className="h-5 w-5" /></button>
            </div>

            <div className="mb-3 flex gap-2">
              {(['return', 'exchange'] as const).map((rt) => (
                <button key={rt} onClick={() => setType(rt)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${type === rt ? 'border-primary bg-primary/10 text-primary' : 'hover:border-primary/40'}`}>
                  {rt === 'return' ? t('sp.return') : t('sp.exchange')}
                </button>
              ))}
            </div>

            <div className="mb-3 space-y-1.5 max-h-40 overflow-y-auto">
              {items.map((i) => (
                <label key={i.productId} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={selected.has(i.productId)} onChange={() => toggle(i.productId)} className="accent-primary" />
                  <span className="flex-1 truncate">{i.name}</span>
                  <span className="text-xs text-muted-foreground">×{i.quantity}</span>
                </label>
              ))}
            </div>

            <label className="mb-1 block text-sm font-medium">{t('sp.reason')}</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="mb-3 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
              {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>

            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('sp.commentOptional')} rows={2} className="mb-4" />

            <label className="mb-1 block text-sm font-medium">{t('sp.telegramOptional')}</label>
            <input
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
              placeholder="@username"
              className="mb-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
            <p className="mb-4 text-xs text-muted-foreground">
              {t('sp.telegramHintPre')}<b>Start</b>{t('sp.telegramHintPost')}
            </p>

            <Button className="w-full" data-testid="return-submit" disabled={busy} onClick={submit}>{busy ? t('sp.sending') : t('sp.sendRequest')}</Button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
