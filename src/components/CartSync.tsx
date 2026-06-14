'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';

const REMINDER_MS = 20 * 1000; // 20 seconds for testing (change to 30 * 60 * 1000 for production)

function playCartSound() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.setValueAtTime(520, ctx.currentTime);
    o.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
    o.frequency.setValueAtTime(780, ctx.currentTime + 0.2);
    g.gain.setValueAtTime(0.18, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.6);
  } catch {}
}

export function CartSync() {
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const items = useCartStore((s) => s.items);
  const saveCart = useMutation(api.cart.save);
  const savedCartJson = useQuery(api.cart.get, sessionToken ? { sessionToken } : 'skip');
  const initialized = useRef(false);
  const prevToken = useRef(sessionToken);
  const reminderTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reminderShown = useRef(false);

  // Load cart from server on login
  useEffect(() => {
    if (!sessionToken || savedCartJson === undefined || initialized.current) return;
    try {
      const serverItems = savedCartJson ? JSON.parse(savedCartJson) : [];
      if (serverItems.length > 0) useCartStore.getState().loadItems(serverItems);
    } catch {}
    initialized.current = true;
  }, [sessionToken, savedCartJson]);

  // On logout: clear local cart (server already has latest from debounced save)
  useEffect(() => {
    const prev = prevToken.current;
    prevToken.current = sessionToken;
    if (prev && !sessionToken && initialized.current) {
      useCartStore.getState().clearCart();
      initialized.current = false;
      reminderShown.current = false;
    }
  }, [sessionToken]);

  // Save cart to server on changes (debounced)
  useEffect(() => {
    if (!sessionToken || !initialized.current) return;
    const t = setTimeout(() => {
      saveCart({ sessionToken, cartJson: JSON.stringify(items) });
    }, 1000);
    return () => clearTimeout(t);
  }, [sessionToken, items, saveCart]);

  // Cart reminder — fires once per session after REMINDER_MS if cart has items
  useEffect(() => {
    clearTimeout(reminderTimer.current);
    if (reminderShown.current || items.length === 0) return;

    reminderTimer.current = setTimeout(() => {
      const count = useCartStore.getState().items.length;
      if (count === 0) return;
      reminderShown.current = true;
      playCartSound();
      toast('🛒 Ձեր զամբյուղն սպասում է', {
        description: (
          <div className="flex flex-col gap-2 mt-1">
            <span>{count} ապրանք պահված է ձեր զամբյուղում:</span>
            <button onClick={() => { window.location.href = '/cart'; }}
              className="w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              Տեսնել զամբյուղը
            </button>
          </div>
        ),
        duration: 12000,
      });
    }, REMINDER_MS);

    return () => clearTimeout(reminderTimer.current);
  }, [items.length]);

  return null;
}
