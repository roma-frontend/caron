'use client';

import { Suspense, useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from '@/components/LocalizedLink';
import { Lock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n/admin';

function ResetPasswordInner() {
  const { t } = useT();
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const resetPassword = useMutation(api.passwordReset.resetPassword);

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const errorToMessage = useCallback((err: unknown): string => {
    const data = (err as { data?: unknown })?.data;
    const code = typeof data === 'object' && data && 'code' in data ? String((data as { code: unknown }).code) : undefined;
    switch (code) {
      case 'WEAK_PASSWORD': return t('auth.resetMin8');
      case 'INVALID_TOKEN': return t('auth.resetInvalidToken');
      default: return t('auth.error');
    }
  }, [t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) { setError(t('auth.resetNoToken')); return; }
    if (form.password.length < 8) { setError(t('auth.resetMin8')); return; }
    if (form.password !== form.confirm) { setError(t('auth.passwordsMismatch')); return; }
    setLoading(true);
    try {
      await resetPassword({ token, newPassword: form.password });
      setDone(true);
      toast.success(t('auth.resetSuccess'));
      setTimeout(() => router.push('/login'), 1500);
    } catch (err) {
      setError(errorToMessage(err));
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
              <h1 className="text-2xl font-bold">{t('auth.resetTitle')}</h1>
            </Link>
            {!done && <p className="text-sm text-muted-foreground">{t('auth.resetDesc')}</p>}
          </div>

          {done ? (
            <div className="space-y-6 text-center">
              <div className="flex justify-center"><CheckCircle2 className="h-12 w-12 text-green-500" /></div>
              <p className="text-sm text-muted-foreground">{t('auth.resetSuccess')}</p>
              <Link href="/login" className="inline-block font-medium text-primary hover:underline">{t('auth.backToLogin')}</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>{t('auth.password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" className="h-11 pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('auth.confirmPassword')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} placeholder="••••••••" className="h-11 pl-10" />
                </div>
              </div>
              {error && <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">{error}</div>}
              <Button type="submit" variant="cta" size="xl" className="w-full" disabled={loading}>
                {loading ? t('auth.resetting') : t('auth.resetSubmit')}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
