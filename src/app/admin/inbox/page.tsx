'use client';

import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { useAuth } from '@/store/auth';
import { useAdminT } from '@/lib/i18n/admin';
import Link from '@/components/LocalizedLink';
import { Card, CardContent } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { formatPrice, formatDateLocalized } from '@/lib/formatters';
import { ShoppingBag, CreditCard, RotateCcw, Star, MessageCircleQuestion, PackageX, ShoppingCart, Phone, Send, ArrowRight } from 'lucide-react';

type Tone = 'primary' | 'amber' | 'red' | 'blue' | 'emerald';
const toneCls: Record<Tone, string> = {
  primary: 'from-primary/15 to-primary/5 text-primary',
  amber: 'from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400',
  red: 'from-red-500/15 to-red-500/5 text-red-600 dark:text-red-400',
  blue: 'from-blue-500/15 to-blue-500/5 text-blue-600 dark:text-blue-400',
  emerald: 'from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400',
};

function QueueCard({ icon: Icon, label, count, href, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; count: number; href: string; tone: Tone }) {
  return (
    <Link href={href}>
      <Card className={`group transition-all hover:-translate-y-0.5 hover:shadow-md ${count > 0 ? 'border-border/80' : 'border-border/40 opacity-70'}`}>
        <CardContent className="flex items-center gap-3 p-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${toneCls[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold tabular-nums">{count}</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </CardContent>
      </Card>
    </Link>
  );
}

export default function InboxPage() {
  const { t } = useAdminT();
  const { sessionToken } = useAuth();
  const inbox = useQuery(api.insights.getInbox, sessionToken ? { sessionToken } : 'skip');
  const carts = useQuery(api.insights.getAbandonedCarts, sessionToken ? { sessionToken } : 'skip');

  if (inbox === undefined) return <div className="flex min-h-[50vh] items-center justify-center"><Loader /></div>;

  const c = inbox.counts;
  const totalOpen = c.pendingOrders + c.awaitingPayment + c.pendingReturns + c.pendingReviews + c.unansweredQuestions + c.zeroStock;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('ib.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('ib.subtitle')}</p>
      </div>

      {totalOpen === 0 && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="py-10 text-center text-lg font-semibold text-emerald-600 dark:text-emerald-400">{t('ib.allClear')}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <QueueCard icon={ShoppingBag} tone="primary" label={t('ib.pendingOrders')} count={c.pendingOrders} href="/admin/orders?status=pending" />
        <QueueCard icon={CreditCard} tone="amber" label={t('ib.awaitingPayment')} count={c.awaitingPayment} href="/admin/orders" />
        <QueueCard icon={RotateCcw} tone="red" label={t('ib.pendingReturns')} count={c.pendingReturns} href="/admin/returns" />
        <QueueCard icon={Star} tone="amber" label={t('ib.pendingReviews')} count={c.pendingReviews} href="/admin/reviews" />
        <QueueCard icon={MessageCircleQuestion} tone="blue" label={t('ib.unansweredQuestions')} count={c.unansweredQuestions} href="/admin/qa" />
        <QueueCard icon={PackageX} tone="red" label={t('ib.zeroStock')} count={c.zeroStock} href="/admin/products?health=zeroStock" />
      </div>

      {/* Abandoned carts */}
      <Card className="border-border/60">
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <div>
              <h2 className="flex items-center gap-2 font-semibold"><ShoppingCart className="h-4 w-4 text-primary" /> {t('ib.abandonedCarts')}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{t('ib.abandonedHint')}</p>
            </div>
            {carts && carts.count > 0 && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{t('ib.totalValue')}</p>
                <p className="font-bold text-primary">{formatPrice(carts.totalValue)}</p>
              </div>
            )}
          </div>
          {carts === undefined ? (
            <div className="py-10"><Loader /></div>
          ) : carts.rows.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">{t('ib.noAbandoned')}</p>
          ) : (
            <div className="divide-y divide-border/40">
              {carts.rows.map((r) => {
                const tgHref = r.telegramUsername ? `https://t.me/${r.telegramUsername}` : undefined;
                const telHref = r.phone ? `tel:${r.phone}` : undefined;
                const mailHref = r.email ? `mailto:${r.email}` : undefined;
                return (
                  <div key={r.userId} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{r.name.charAt(0).toUpperCase()}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.email || r.phone || (r.telegramUsername ? `@${r.telegramUsername}` : '—')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{formatPrice(r.total)}</p>
                      <p className="text-[11px] text-muted-foreground">{r.itemCount} {t('ib.items')}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {tgHref && <a href={tgHref} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 text-[#0088cc] transition-colors hover:bg-[#0088cc]/10" title="Telegram"><Send className="h-4 w-4" /></a>}
                      {telHref && <a href={telHref} className="rounded-lg p-2 text-emerald-600 transition-colors hover:bg-emerald-500/10" title="Phone"><Phone className="h-4 w-4" /></a>}
                      {mailHref && <a href={mailHref} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent" title="Email"><ArrowRight className="h-4 w-4" /></a>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent previews */}
      <div className="grid gap-4 md:grid-cols-3">
        <PreviewList title={t('ib.recentOrders')} items={inbox.previews.orders.map((o) => ({ id: o.id, primary: `#${o.orderNumber}`, secondary: o.customerName, meta: formatPrice(o.total), createdAt: o.createdAt }))} href="/admin/orders" t={t} />
        <PreviewList title={t('ib.recentReturns')} items={inbox.previews.returns.map((r) => ({ id: r.id, primary: `#${r.orderNumber}`, secondary: r.type, meta: '', createdAt: r.createdAt }))} href="/admin/returns" t={t} />
        <PreviewList title={t('ib.recentQuestions')} items={inbox.previews.questions.map((q) => ({ id: q.id, primary: q.authorName, secondary: q.question, meta: '', createdAt: q.createdAt }))} href="/admin/qa" t={t} />
      </div>
    </div>
  );
}

function PreviewList({ title, items, href, t }: { title: string; items: { id: string; primary: string; secondary: string; meta: string; createdAt: number }[]; href: string; t: (k: string) => string }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-0">
        <Link href={href} className="flex items-center justify-between border-b px-4 py-3 hover:bg-muted/30">
          <h3 className="text-sm font-semibold">{title}</h3>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        {items.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">—</p>
        ) : (
          <div className="divide-y divide-border/40">
            {items.map((it) => (
              <div key={it.id} className="px-4 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{it.primary}</span>
                  {it.meta && <span className="shrink-0 text-sm font-semibold text-primary">{it.meta}</span>}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-muted-foreground">{it.secondary}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{formatDateLocalized(it.createdAt, t)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
