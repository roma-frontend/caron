'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { showUndoCountdownToast } from '@/lib/undoCountdownToast';

const REMINDER_MS = 15 * 60 * 1000; // show the cart reminder 15 minutes after items are added

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
  const router = useRouter();
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
      showUndoCountdownToast({
        message: 'Հիշեցում',
        description: `${count} ապրանք(ներ) ձեր զամբյուղում`,
        onUndo: () => router.push('/cart'),
        undoLabel: 'Տեսնել զամբյուղը',
        durationMs: 4000,
      });
    }, REMINDER_MS);

    return () => clearTimeout(reminderTimer.current);
  }, [items.length, router]);

  return null;
}
