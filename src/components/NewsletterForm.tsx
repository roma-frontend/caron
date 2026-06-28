'use client';

import { useState } from 'react';
import { useT } from '@/lib/i18n/admin';
import { Turnstile, turnstileEnabled } from '@/components/shared/Turnstile';

export function NewsletterForm() {
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [tsKey, setTsKey] = useState(0);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || (turnstileEnabled() && !token)) return;
    setBusy(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, turnstileToken: token }),
      });
      if (res.ok) {
        setEmail('');
        setToken('');
        setTsKey((k) => k + 1);
        alert(t('misc.subscribed'));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border bg-muted/50 p-5">
      <h4 className="mb-1 font-semibold">{t('misc.newsTitle')}</h4>
      <p className="mb-3 text-xs text-muted-foreground">{t('misc.newsSubtitle')}</p>
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            placeholder="your@email.com"
            className="h-9 flex-1 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            disabled={busy || (turnstileEnabled() && !token)}
            className="rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            OK
          </button>
        </div>
        <Turnstile key={tsKey} onVerify={setToken} />
      </form>
    </div>
  );
}
