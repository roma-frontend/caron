'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from '@/components/LocalizedLink';
import { Mail, Lock } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { setAuthCookie } from '@/actions/auth';
import { toast } from 'sonner';
import { TelegramLoginButton, type TelegramAuthUser } from '@/components/TelegramLoginButton';
import { useT } from '@/lib/i18n/admin';

export default function LoginPage() {
  const { t } = useT();
  const router = useRouter();

  // Map structured ConvexError codes (delivered even in production) to friendly
  // translated text. Falls back to a generic message for anything unexpected so
  // raw "[CONVEX M(auth:login)] … Server Error" strings never reach the user.
  const errorToMessage = useCallback((err: unknown): string => {
    const data = (err as { data?: unknown })?.data;
    const code = typeof data === 'object' && data && 'code' in data
      ? String((data as { code: unknown }).code)
      : undefined;
    switch (code) {
      case 'INVALID_CREDENTIALS': return t('auth.errInvalidCredentials');
      case 'TOO_MANY_ATTEMPTS': return t('auth.errTooManyAttempts');
      case 'USER_INACTIVE': return t('auth.errUserInactive');
      default: return t('auth.loginError');
    }
  }, [t]);
  const login = useMutation(api.auth.login);
  const loginWithTelegram = useMutation(api.auth.loginWithTelegram);
  const setSession = useAuthStore((s) => s.setSession);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) { toast.error(t('auth.fillAllFields')); return; }
    setLoading(true);
    try {
      const result = await login(form);
      setSession(result.sessionToken, { id: result.userId, name: result.name, email: result.email, role: result.role, customerType: result.customerType, discountPercent: result.discountPercent, phone: result.phone });
      await setAuthCookie(result.sessionToken);
      toast.success(t('auth.welcomeBack') + result.name + '!');
      router.push(result.role === 'admin' || result.role === 'manager' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(errorToMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleTelegram = useCallback(async (u: TelegramAuthUser) => {
    try {
      const result = await loginWithTelegram({
        id: String(u.id),
        firstName: u.first_name,
        lastName: u.last_name,
        username: u.username,
        photoUrl: u.photo_url,
        authDate: String(u.auth_date),
        hash: u.hash,
      });
      setSession(result.sessionToken, { id: result.userId, name: result.name, email: result.email, role: result.role, customerType: result.customerType, discountPercent: result.discountPercent, phone: result.phone, telegramUsername: result.telegramUsername });
      await setAuthCookie(result.sessionToken);
      toast.success(t('auth.welcomeBack') + result.name + '!');
      router.push(result.role === 'admin' || result.role === 'manager' ? '/admin' : '/dashboard');
    } catch (err) {
      toast.error(errorToMessage(err));
    }
  }, [loginWithTelegram, setSession, router, errorToMessage, t]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute left-[-15%] top-[-20%] h-[600px] w-[600px] rounded-full mesh-orb-1" style={{ background: 'radial-gradient(circle, var(--landing-orb-1) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full mesh-orb-2" style={{ background: 'radial-gradient(circle, var(--landing-orb-2) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      <div className="hero-fade-1 w-full" style={{ maxWidth: '26rem' }}>


        <div className="rounded-2xl border bg-background/80 p-5 sm:p-8 shadow-xl backdrop-blur-sm" style={{ boxShadow: 'var(--shadow-xl)' }}>
          <div className="mb-6 text-center">
            <Link href="/" className="mb-8 flex flex-col items-center gap-3 transition-transform hover:scale-105">
              {/* Compact app-icon brand mark (matches the register page). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/favicon.svg" alt="Caron" width={48} height={48} className="h-12 w-12 rounded-2xl shadow-md" />
              <h1 className="text-2xl font-bold">{t('auth.login')}</h1>
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('auth.email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={t('auth.emailPlaceholder')} className="h-11 pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('auth.password')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" className="h-11 pl-10" />
              </div>
            </div>
            {error && <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200">{error}</div>}
            <Button type="submit" variant="cta" size="xl" className="w-full" disabled={loading}>
              {loading ? t('auth.loggingIn') : t('auth.login')}
            </Button>
          </form>

          <TelegramLoginButton onAuth={handleTelegram} />

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t('auth.noAccount')}
            <Link href="/register" className="font-medium text-primary hover:underline">
              {t('auth.register')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
