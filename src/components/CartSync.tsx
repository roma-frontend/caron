'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export function CartSync() {
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const items = useCartStore((s) => s.items);
  const saveCart = useMutation(api.cart.save);
  const savedCartJson = useQuery(api.cart.get, sessionToken ? { sessionToken } : 'skip');
  const initialized = useRef(false);

  // Load cart from server on login
  useEffect(() => {
    if (!sessionToken || !savedCartJson || initialized.current) return;
    try {
      const serverItems = JSON.parse(savedCartJson);
      if (serverItems.length > 0) {
        useCartStore.getState().loadItems(serverItems);
      }
    } catch {}
    initialized.current = true;
  }, [sessionToken, savedCartJson]);

  // Save cart to server on changes
  useEffect(() => {
    if (!sessionToken || !initialized.current) return;
    const t = setTimeout(() => {
      saveCart({ sessionToken, cartJson: JSON.stringify(items) });
    }, 1000);
    return () => clearTimeout(t);
  }, [sessionToken, items, saveCart]);

  return null;
}
