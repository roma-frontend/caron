'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone, Lock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { setAuthCookie } from '@/actions/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/layout/Logo';
import { useSettings } from '@/hooks/useSettings';

export default function RegisterPage() {
  const router = useRouter();
  const settings = useSettings();
  const register = useMutation(api.auth.register);
  const setSession = useAuthStore((s) => s.setSession);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { toast.error('Լրացրեք պարտադիր դաշտերը'); return; }
    if (form.password !== form.confirm) { toast.error('Գաղտնաբառերը չեն համապատասխանում'); return; }
    if (form.password.length < 6) { toast.error('Գաղտնաբառը պետք է պարունակի գոնե 6 նիշ'); return; }
    setBusy(true);
    try {
      const result = await register({ name: form.name, email: form.email, phone: form.phone || undefined, password: form.password });
      setSession(result.sessionToken, { id: result.userId, name: result.name, email: result.email, role: result.role, customerType: result.customerType, discountPercent: result.discountPercent, phone: result.phone });
      await setAuthCookie(result.sessionToken);
      toast.success('Գրանցումը հաջողվեց');
      router.push('/dashboard');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Սխալ');
    } finally { setBusy(false); }
  };

  if (settings && settings.enableRegistration === false) {
    return (
      <div className="relative flex min-h-screen items-center justify-center px-4">
        <div className="rounded-2xl border bg-background/80 p-5 sm:p-8 shadow-xl backdrop-blur-sm text-center">
          <div className="mb-6">
            <Link href="/" className="mb-4 flex flex-col items-center gap-3">
              <Logo size={48} />
            </Link>
            <h1 className="text-2xl font-bold">Գրանցում</h1>
            <p className="mt-3 text-muted-foreground">Գրանցումը ժամանակավոր անհասանելի է</p>
          </div>
          <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            Մուտք
          </Link>
        </div>
      </div>
    );
  }

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
              <Logo size={48} />
              <h1 className="text-2xl font-bold">Գրանցում</h1>
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Անուն *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11 pl-10" placeholder="Ձեր անունը" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Էլ. փոստ *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-11 pl-10" placeholder="Ձեր էլ. փոստը" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Հեռախոս</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-11 pl-10" placeholder="+374 XX XXX XXX" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Գաղտնաբառ *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-11 pl-10" placeholder="Մին. 6 նիշ" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Հաստատել գաղտնաբառ *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} className="h-11 pl-10" placeholder="Կրկնել գաղտնաբառը" />
              </div>
            </div>
            <Button type="submit" disabled={busy} variant="cta" size="xl" className="w-full gap-2">
              {busy ? 'Գրանցվում է...' : 'Գրանցվել'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Արդեն ունեք հաշիվ?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Մուտք <ArrowRight className="inline h-3 w-3" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
