'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';
import Link from 'next/link';

const REMINDER_MS = 30 * 60 * 1000; // 30 minutes

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
  const reminderTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Load cart from server on login
  useEffect(() => {
    if (!sessionToken || savedCartJson === undefined || initialized.current) return;
    try {
      const serverItems = savedCartJson ? JSON.parse(savedCartJson) : [];
      if (serverItems.length > 0) {
        useCartStore.getState().loadItems(serverItems);
      }
    } catch {}
    initialized.current = true;
  }, [sessionToken, savedCartJson]);

  const prevToken = useRef(sessionToken);

  // On logout: save cart to server first, then clear local
  useEffect(() => {
    const prev = prevToken.current;
    prevToken.current = sessionToken;
    if (prev && !sessionToken && initialized.current) {
      const items = useCartStore.getState().items;
      if (items.length > 0) {
        saveCart({ sessionToken: prev, cartJson: JSON.stringify(items) }).finally(() => {
          useCartStore.getState().clearCart();
        });
      } else {
        useCartStore.getState().clearCart();
      }
      initialized.current = false;
    }
  }, [sessionToken, saveCart]);

  // Save cart to server on changes (debounced)
  useEffect(() => {
    if (!sessionToken || !initialized.current) return;
    const t = setTimeout(() => {
      saveCart({ sessionToken, cartJson: JSON.stringify(items) });
    }, 1000);
    return () => clearTimeout(t);
  }, [sessionToken, items, saveCart]);

  // Cart reminder for guests with items in localStorage
  useEffect(() => {
    clearTimeout(reminderTimer.current);
    if (sessionToken || items.length === 0) return;

    reminderTimer.current = setTimeout(() => {
      const count = useCartStore.getState().items.length;
      if (count === 0) return;
      playCartSound();
      toast('🛒 Ձեր զամբյուղն սպասում է', {
        description: `${count} ապրանք պահված է ձեր զամբյուղում: Մի մոռացեք ձևակերպել պատվեր:`,
        duration: 12000,
        action: {
          label: 'Տեսնել զամբյուղը',
          onClick: () => { window.location.href = '/cart'; },
        },
      });
    }, REMINDER_MS);

    return () => clearTimeout(reminderTimer.current);
  }, [sessionToken, items.length]);

  return null;
}
