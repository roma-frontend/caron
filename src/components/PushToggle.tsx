'use client';

import { useEffect, useState } from 'react';
import { useMutation } from 'convex/react';
import { Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { api } from '../../convex/_generated/api';
import { useAuthStore } from '@/store/auth';
import { useT } from '@/lib/i18n/admin';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Enable/disable browser push notifications (order status, etc.). */
export function PushToggle() {
  const { t } = useT();
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const subscribeMut = useMutation(api.push.subscribe);
  const unsubscribeMut = useMutation(api.push.unsubscribe);
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ok = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && Boolean(VAPID_PUBLIC_KEY);
    setSupported(ok);
    if (!ok) return;
    navigator.serviceWorker.getRegistration().then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setSubscribed(Boolean(sub)))
      .catch(() => {});
  }, []);

  if (!supported) return null;

  const enable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { toast.error(t('cmp.push_blocked')); return; }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!) as BufferSource,
      });
      const json = sub.toJSON();
      await subscribeMut({
        sessionToken: sessionToken || undefined,
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? '',
        auth: json.keys?.auth ?? '',
      });
      setSubscribed(true);
      toast.success(t('cmp.push_enabled'));
    } catch { toast.error(t('cmp.push_enable_fail')); } finally { setBusy(false); }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) { await unsubscribeMut({ endpoint: sub.endpoint }); await sub.unsubscribe(); }
      setSubscribed(false);
      toast.success(t('cmp.push_disabled'));
    } catch { /* ignore */ } finally { setBusy(false); }
  };

  return (
    <Button variant="outline" size="sm" className="gap-2" disabled={busy} onClick={subscribed ? disable : enable}>
      {subscribed ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
      {subscribed ? t('cmp.push_turn_off') : t('cmp.push_turn_on')}
    </Button>
  );
}
