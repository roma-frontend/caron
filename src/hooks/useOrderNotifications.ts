'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export function useOrderNotifications() {
  const orders = useQuery(api.orders.listAdmin, {});
  const pendingCount = orders?.filter((o) => o.status === 'pending').length ?? 0;
  const prevCount = useRef(pendingCount);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (pendingCount > prevCount.current && prevCount.current !== 0) {
      // New order arrived!
      playSound();
      setFlash(true);
      setTimeout(() => setFlash(false), 3000);
    }
    prevCount.current = pendingCount;
  }, [pendingCount]);

  return { pendingCount, flash };
}

function playSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}
