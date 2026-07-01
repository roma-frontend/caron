'use client';

import { useState, useCallback, useMemo } from 'react';
import { useMutation, useAction } from 'convex/react';
import { AnimatePresence, motion } from '@/lib/motion';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone, Lock, ArrowRight, ArrowLeft, Gift, ShieldCheck, Check, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { setAuthCookie } from '@/actions/auth';
import Link from '@/components/LocalizedLink';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/layout/Logo';
import { useSettings } from '@/hooks/useSettings';
import { TelegramLoginButton, type TelegramAuthUser } from '@/components/TelegramLoginButton';
import { useT, type AdminTFn } from '@/lib/i18n/admin';
import { Turnstile, turnstileEnabled } from '@/components/shared/Turnstile';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOTAL_STEPS = 3;

/** 0..4 password-strength score. */
function passwordScore(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}

function StrengthMeter({ score, t }: { score: number; t: AdminTFn }) {
  const labels = ['', t('auth.pw.weak'), t('auth.pw.fair'), t('auth.pw.good'), t('auth.pw.strong')];
  const colors = ['bg-muted', 'bg-destructive', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
  const textColors = ['text-muted-foreground', 'text-destructive', 'text-orange-500', 'text-yellow-600', 'text-green-600'];
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full transition-all duration-300 ${i <= score ? colors[score] : 'bg-transparent'}`} style={{ width: i <= score ? '100%' : '0%' }} />
          </div>
        ))}
      </div>
      {score > 0 && (
        <p className={`text-xs ${textColors[score]}`}>{t('auth.pw.strength')}: {labels[score]}</p>
      )}
    </div>
  );
}

/** A numbered/checked progress stepper with a connecting track. */
function Stepper({ step, titles }: { step: number; titles: string[] }) {
  const icons = [User, Lock, ShieldCheck];
  return (
    <div className="mb-7 flex items-center">
      {titles.map((_, i) => {
        const Icon = icons[i];
        const done = i < step;
        const active = i === step;
        return (
          <div key={i} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  done
                    ? 'border-primary bg-primary text-primary-foreground'
                    : active
                      ? 'border-primary bg-primary/10 text-primary scale-110 ring-4 ring-primary/15'
                      : 'border-border bg-background text-muted-foreground'
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
            </div>
            {i < titles.length - 1 && (
              <div className="mx-1.5 h-0.5 flex-1 overflow-hidden rounded-full bg-border">
                <div className={`h-full rounded-full bg-primary transition-all duration-500 ${done ? 'w-full' : 'w-0'}`} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function RegisterPage() {
  const { t } = useT();
  const router = useRouter();
  const settings = useSettings();
  const register = useAction(api.auth.registerWithTurnstile);
  const loginWithTelegram = useMutation(api.auth.loginWithTelegram);
  const setSession = useAuthStore((s) => s.setSession);

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1); // animation direction
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [captcha, setCaptcha] = useState('');
  const [tsKey, setTsKey] = useState(0);
  const [refCode, setRefCode] = useState(() =>
    typeof window === 'undefined'
      ? ''
      : new URLSearchParams(window.location.search).get('ref')?.trim() ?? '',
  );

  const pwScore = useMemo(() => passwordScore(form.password), [form.password]);
  const titles = [t('auth.wizard.step1Title'), t('auth.wizard.step2Title'), t('auth.wizard.step3Title')];
  const descs = [t('auth.wizard.step1Desc'), t('auth.wizard.step2Desc'), t('auth.wizard.step3Desc')];

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
      toast.error(err instanceof Error ? err.message : t('auth.telegramLoginError'));
    }
  }, [loginWithTelegram, setSession, router, t]);

  /** Validate the current step; returns true when it may be left. */
  const validateStep = (s: number): boolean => {
    if (s === 0) {
      if (!form.name.trim() || !form.email.trim()) { toast.error(t('auth.fillRequiredFields')); return false; }
      if (!EMAIL_RE.test(form.email.trim())) { toast.error(t('auth.wizard.emailInvalid')); return false; }
      return true;
    }
    if (s === 1) {
      if (form.password.length < 6) { toast.error(t('auth.passwordMinLength')); return false; }
      if (form.password !== form.confirm) { toast.error(t('auth.passwordsMismatch')); return false; }
      return true;
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setDir(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };
  const goBack = () => { setDir(-1); setStep((s) => Math.max(s - 1, 0)); };

  const doRegister = async () => {
    if (!validateStep(0) || !validateStep(1)) return;
    setBusy(true);
    try {
      const result = await register({ name: form.name, email: form.email, phone: form.phone || undefined, password: form.password, referralCode: refCode || undefined, turnstileToken: captcha || undefined });
      setSession(result.sessionToken, { id: result.userId, name: result.name, email: result.email, role: result.role, customerType: result.customerType, discountPercent: result.discountPercent, phone: result.phone });
      await setAuthCookie(result.sessionToken);
      toast.success(t('auth.registerSuccess'));
      router.push('/dashboard');
    } catch (e) {
      setCaptcha(''); setTsKey((k) => k + 1);
      toast.error(e instanceof Error ? e.message : t('auth.error'));
    } finally { setBusy(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < TOTAL_STEPS - 1) goNext();
    else doRegister();
  };

  if (settings && settings.enableRegistration === false) {
    return (
      <div className="relative flex min-h-dvh items-center justify-center px-4">
        <div className="rounded-2xl border bg-background/80 p-5 sm:p-8 shadow-xl backdrop-blur-sm text-center">
          <div className="mb-6">
            <Link href="/" className="mb-4 flex flex-col items-center gap-3">
              <Logo size={48} />
            </Link>
            <h1 className="text-2xl font-bold">{t('auth.registerTitle')}</h1>
            <p className="mt-3 text-muted-foreground">{t('auth.registrationDisabled')}</p>
          </div>
          <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            {t('auth.login')}
          </Link>
        </div>
      </div>
    );
  }

  const inputBase = 'h-11 pl-10';
  const iconCls = 'absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground';

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute left-[-15%] top-[-20%] h-[600px] w-[600px] rounded-full mesh-orb-1" style={{ background: 'radial-gradient(circle, var(--landing-orb-1) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full mesh-orb-2" style={{ background: 'radial-gradient(circle, var(--landing-orb-2) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      <div className="hero-fade-1 w-full" style={{ maxWidth: '28rem' }}>
        <div className="rounded-2xl border bg-background/80 p-5 sm:p-8 shadow-xl backdrop-blur-sm" style={{ boxShadow: 'var(--shadow-xl)' }}>
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <Link href="/" className="transition-transform hover:scale-105" aria-label="Caron">
              {/* Compact brand mark (the app-icon favicon) — far less bulky than
                  the full wordmark, and gives the card a modern, focused look. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/favicon.svg" alt="Caron" width={48} height={48} className="h-12 w-12 rounded-2xl shadow-md" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{t('auth.registerTitle')}</h1>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {t('auth.wizard.stepWord')} {step + 1} {t('auth.wizard.of')} {TOTAL_STEPS}
              </p>
            </div>
          </div>

          <Stepper step={step} titles={titles} />

          <div className="mb-5 text-center">
            <h2 className="text-base font-semibold">{titles[step]}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{descs[step]}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative overflow-hidden px-1.5 -mx-1.5 py-1 -my-1">
              <AnimatePresence mode="wait" initial={false} custom={dir}>
                <motion.div
                  key={step}
                  custom={dir}
                  initial={{ x: dir * 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: dir * -40, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="space-y-4"
                >
                  {step === 0 && (
                    <>
                      <div className="space-y-2">
                        <Label>{t('auth.name')} *</Label>
                        <div className="relative">
                          <User className={iconCls} />
                          <Input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputBase} placeholder={t('auth.namePlaceholder')} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('auth.email')} *</Label>
                        <div className="relative">
                          <Mail className={iconCls} />
                          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputBase} placeholder={t('auth.emailPlaceholder')} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          {t('auth.phone')}
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-normal text-muted-foreground">{t('auth.wizard.optional')}</span>
                        </Label>
                        <div className="relative">
                          <Phone className={iconCls} />
                          <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputBase} placeholder="+374 XX XXX XXX" />
                        </div>
                      </div>
                    </>
                  )}

                  {step === 1 && (
                    <>
                      <div className="space-y-2">
                        <Label>{t('auth.password')} *</Label>
                        <div className="relative">
                          <Lock className={iconCls} />
                          <Input autoFocus type={showPw ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-11 pl-10 pr-10" placeholder={t('auth.passwordPlaceholderMin')} />
                          <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label="toggle password">
                            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <StrengthMeter score={pwScore} t={t} />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('auth.confirmPassword')} *</Label>
                        <div className="relative">
                          <Lock className={iconCls} />
                          <Input type={showPw ? 'text' : 'password'} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} className="h-11 pl-10 pr-10" placeholder={t('auth.confirmPasswordPlaceholder')} />
                          {form.confirm.length > 0 && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2">
                              {form.confirm === form.password
                                ? <Check className="h-4 w-4 text-green-500" />
                                : <span className="block h-2 w-2 rounded-full bg-destructive" />}
                            </span>
                          )}
                        </div>
                        {form.confirm.length > 0 && (
                          <p className={`text-xs ${form.confirm === form.password ? 'text-green-600' : 'text-destructive'}`}>
                            {form.confirm === form.password ? t('auth.pw.match') : t('auth.pw.noMatch')}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {step === 2 && (
                    <>
                      {/* Quick recap so users feel in control before finishing */}
                      <div className="rounded-xl border bg-muted/40 p-3 text-sm">
                        <div className="flex items-center justify-between gap-2 py-0.5">
                          <span className="text-muted-foreground">{t('auth.wizard.summaryName')}</span>
                          <span className="truncate font-medium">{form.name}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 py-0.5">
                          <span className="text-muted-foreground">{t('auth.wizard.summaryEmail')}</span>
                          <span className="truncate font-medium">{form.email}</span>
                        </div>
                        {form.phone && (
                          <div className="flex items-center justify-between gap-2 py-0.5">
                            <span className="text-muted-foreground">{t('auth.phone')}</span>
                            <span className="truncate font-medium">{form.phone}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          {t('auth.referralCodeLabel')}
                        </Label>
                        <div className="relative">
                          <Gift className={iconCls} />
                          <Input value={refCode} onChange={(e) => setRefCode(e.target.value.toUpperCase().trim())} className={inputBase} placeholder={t('auth.referralPlaceholder')} />
                        </div>
                      </div>
                      <Turnstile key={tsKey} onVerify={setCaptcha} className="flex justify-center" />
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-3 pt-1">
              {step > 0 && (
                <Button type="button" variant="outline" size="xl" className="gap-2" onClick={goBack} disabled={busy}>
                  <ArrowLeft className="h-4 w-4" /> {t('auth.wizard.back')}
                </Button>
              )}
              {step < TOTAL_STEPS - 1 ? (
                <Button type="submit" variant="cta" size="xl" className="flex-1 gap-2">
                  {t('auth.wizard.next')} <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={busy || (turnstileEnabled() && !captcha)} variant="cta" size="xl" className="flex-1 gap-2">
                  {busy ? t('auth.registering') : t('auth.register')}
                </Button>
              )}
            </div>
          </form>

          {/* Fast path + login link only on the first step to keep later steps focused */}
          {step === 0 && (
            <>
              <TelegramLoginButton onAuth={handleTelegram} />
              <p className="mt-4 text-center text-sm text-muted-foreground">
                {t('auth.haveAccount')}{' '}
                <Link href="/login" className="font-medium text-primary hover:underline">
                  {t('auth.login')} <ArrowRight className="inline h-3 w-3" />
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
