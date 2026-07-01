'use client';

import { useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from '@/components/LocalizedLink';
import { Mail, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n/admin';

export default function ForgotPasswordPage() {
  const { t } = useT();
  const requestReset = useAction(api.passwordReset.requestPasswordReset);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error(t('auth.fillAllFields')); return; }
    setLoading(true);
    try {
      await requestReset({ email });
      setSent(true);
    } catch {
      // Endpoint never leaks account existence; treat as sent regardless.
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute left-[-15%] top-[-20%] h-[600px] w-[600px] rounded-full mesh-orb-1" style={{ background: 'radial-gradient(circle, var(--landing-orb-1) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full mesh-orb-2" style={{ background: 'radial-gradient(circle, var(--landing-orb-2) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      <div className="hero-fade-1 w-full" style={{ maxWidth: '26rem' }}>
        <div className="rounded-2xl border bg-background/80 p-5 sm:p-8 shadow-xl backdrop-blur-sm" style={{ boxShadow: 'var(--shadow-xl)' }}>
          <div className="mb-6 text-center">
            <Link href="/" className="mb-6 flex flex-col items-center gap-3 transition-transform hover:scale-105">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/favicon.svg" alt="Caron" width={48} height={48} className="h-12 w-12 rounded-2xl shadow-md" />
              <h1 className="text-2xl font-bold">{t('auth.forgotTitle')}</h1>
            </Link>
            {!sent && <p className="text-sm text-muted-foreground">{t('auth.forgotDesc')}</p>}
          </div>

          {sent ? (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <p className="text-sm text-muted-foreground">{t('auth.forgotSent')}</p>
              <Link href="/login" className="inline-block font-medium text-primary hover:underline">
                {t('auth.backToLogin')}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>{t('auth.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('auth.emailPlaceholder')} className="h-11 pl-10" />
                </div>
              </div>
              <Button type="submit" variant="cta" size="xl" className="w-full" disabled={loading}>
                {loading ? t('auth.forgotSending') : t('auth.forgotSubmit')}
              </Button>
              <p className="text-center text-sm">
                <Link href="/login" className="font-medium text-primary hover:underline">{t('auth.backToLogin')}</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
