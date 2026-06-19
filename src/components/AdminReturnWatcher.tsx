'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuthStore } from '@/store/auth';
import { useOrderNotificationStore } from '@/store/orderNotifications';
import { toast } from 'sonner';
import { RotateCcw } from 'lucide-react';
import Link from 'next/link';

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    [{ f: 660, s: 0 }, { f: 880, s: 0.14 }, { f: 660, s: 0.28 }].forEach(({ f, s }) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + s);
      osc.connect(gain);
      osc.start(now + s);
      osc.stop(now + s + 0.14);
    });
  } catch {}
}

/** Live admin notifier for new return/exchange requests (toast + sound + badge). */
export function AdminReturnWatcher() {
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const setReturnsPendingCount = useOrderNotificationStore((s) => s.setReturnsPendingCount);
  const setReturnsFlash = useOrderNotificationStore((s) => s.setReturnsFlash);

  const requests = useQuery(
    api.returns.listAll,
    sessionToken && isAdmin ? { sessionToken, status: 'pending' as const } : 'skip',
  );

  const pendingCount = requests?.length ?? 0;
  const prevCount = useRef(pendingCount);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      prevCount.current = pendingCount;
      setReturnsPendingCount(pendingCount);
      return;
    }

    setReturnsPendingCount(pendingCount);
    if (!isAdmin) return;

    if (pendingCount > prevCount.current) {
      setReturnsFlash(true);
      setTimeout(() => setReturnsFlash(false), 3000);
      playNotificationSound();

      const req = requests?.[0];
      if (req) {
        toast.custom(
          (t) => (
            <Link
              href="/admin/returns"
              onClick={() => toast.dismiss(t)}
              className="flex w-full items-start gap-4 rounded-xl border bg-card p-4 shadow-xl ring-1 ring-primary/20"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15">
                <RotateCcw className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-primary">Նոր հայտ՝ {req.type === 'exchange' ? 'Փոխանակում' : 'Վերադարձ'}</p>
                <p className="mt-0.5 text-sm font-semibold truncate">#{req.orderNumber}</p>
                <p className="mt-0.5 text-xs text-muted-foreground truncate">{req.reason}</p>
              </div>
            </Link>
          ),
          { duration: 8000, position: 'top-right' },
        );
      }
    }

    prevCount.current = pendingCount;
  }, [pendingCount, isAdmin, requests, setReturnsPendingCount, setReturnsFlash]);

  return null;
}
