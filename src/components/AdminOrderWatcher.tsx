'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuthStore } from '@/store/auth';
import { useOrderNotificationStore } from '@/store/orderNotifications';
import { toast } from 'sonner';
import { ShoppingBag } from 'lucide-react';
import Link from '@/components/LocalizedLink';
import { formatPrice } from '@/lib/formatters';
import { useT } from '@/lib/i18n/admin';

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const notes = [
      { freq: 523.25, start: 0, dur: 0.12 },
      { freq: 659.25, start: 0.12, dur: 0.12 },
      { freq: 783.99, start: 0.24, dur: 0.12 },
      { freq: 1046.5, start: 0.36, dur: 0.3 },
    ];

    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);
      osc.connect(gain);
      osc.start(now + start);
      osc.stop(now + start + dur);
    });
  } catch {}
}

export function AdminOrderWatcher() {
  const { t } = useT();
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const setPendingCount = useOrderNotificationStore((s) => s.setPendingCount);
  const setFlash = useOrderNotificationStore((s) => s.setFlash);

  const orders = useQuery(
    api.orders.listAdmin,
    sessionToken && isAdmin ? { sessionToken } : 'skip',
  );

  const pendingCount = orders?.filter((o) => o.status === 'pending').length ?? 0;
  const prevCount = useRef(pendingCount);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      prevCount.current = pendingCount;
      setPendingCount(pendingCount);
      return;
    }

    setPendingCount(pendingCount);

    if (!isAdmin) return;

    if (pendingCount > prevCount.current) {
      setFlash(true);
      setTimeout(() => setFlash(false), 3000);
      playNotificationSound();

      const newOrder = orders?.find((o) => o.status === 'pending' && o.orderNumber);
      const order = newOrder || orders?.[0];

      if (order) {
        toast.custom(
          (tp) => (
            <Link
              href="/admin/orders"
              onClick={() => toast.dismiss(tp)}
              className="flex w-full items-start gap-4 rounded-xl border bg-card p-4 shadow-xl ring-1 ring-primary/20"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15">
                <ShoppingBag className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-primary">{t('sx.order.new')}</p>
                <p className="mt-0.5 text-sm font-semibold truncate">
                  #{order.orderNumber}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground truncate">
                  {order.customerName} — {formatPrice(order.total)}
                </p>
              </div>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                !
              </div>
            </Link>
          ),
          {
            duration: 8000,
            position: 'top-right',
          },
        );
      }
    }

    prevCount.current = pendingCount;
  }, [pendingCount, isAdmin, orders, setPendingCount, setFlash]);

  return null;
}
