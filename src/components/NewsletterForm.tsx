'use client';

import { useT } from '@/lib/i18n/admin';

export function NewsletterForm() {
  const { t } = useT();
  return (
    <div className="rounded-xl border bg-muted/50 p-5">
      <h4 className="mb-1 font-semibold">{t('misc.newsTitle')}</h4>
      <p className="mb-3 text-xs text-muted-foreground">{t('misc.newsSubtitle')}</p>
      <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const form = e.currentTarget; fetch('/api/newsletter', { method: 'POST', body: JSON.stringify({ email: f.get('email') }) }).then(() => { form.reset(); alert(t('misc.subscribed')); }); }} className="flex gap-2">
        <input name="email" type="email" required placeholder="your@email.com" className="h-9 flex-1 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
        <button type="submit" className="rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">OK</button>
      </form>
    </div>
  );
}
